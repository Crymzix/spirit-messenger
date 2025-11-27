import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyPluginAsync } from 'fastify';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(rateLimit, {
        max: 1000,
        timeWindow: '1 minutes',
        errorResponseBuilder: () => ({
            success: false,
            error: 'Too many requests, please try again later',
        }),
    });
};

export default fp(rateLimitPlugin);
