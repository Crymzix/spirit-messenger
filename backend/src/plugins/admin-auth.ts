import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

const adminAuthPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('authenticateAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        const adminApiKey = process.env.ADMIN_API_KEY;

        if (!adminApiKey) {
            fastify.log.error('ADMIN_API_KEY environment variable not set');
            return reply.status(500).send({
                success: false,
                error: 'Server configuration error'
            });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                error: 'Unauthorized - No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        if (token !== adminApiKey) {
            return reply.status(403).send({
                success: false,
                error: 'Invalid admin API key'
            });
        }

        // Token is valid, continue to handler
    });
};

export default fp(adminAuthPlugin);
