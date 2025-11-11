import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import { supabase } from '../lib/supabase.js';

const authPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                error: 'Unauthorized - No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                return reply.status(403).send({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            request.user = user;
        } catch (error) {
            return reply.status(403).send({
                success: false,
                error: 'Authentication failed'
            });
        }
    });
};

export default fp(authPlugin);
