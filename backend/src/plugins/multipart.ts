import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import { FastifyPluginAsync } from 'fastify';

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(multipart, {
        limits: {
            fileSize: 100 * 1024 * 1024, // 100 MB max file size
            files: 1, // Max 1 file per request
        },
    });
};

export default fp(multipartPlugin);
