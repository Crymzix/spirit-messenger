import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import authPlugin from './plugins/auth.js';
import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import multipartPlugin from './plugins/multipart.js';
import { startPresenceListener, stopPresenceListener } from './services/presence-listener.js';
import { createCallTimeoutWorker } from './workers/call-timeout-worker.js';
import type { Worker } from 'bullmq';

const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
});

// Environment variables schema
const schema = {
    type: 'object',
    required: ['PORT', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'],
    properties: {
        PORT: {
            type: 'number',
            default: 1056
        },
        NODE_ENV: {
            type: 'string',
            default: 'development'
        },
        HOST: {
            type: 'string',
            default: '0.0.0.0'
        },
        SUPABASE_URL: {
            type: 'string'
        },
        SUPABASE_SERVICE_ROLE_KEY: {
            type: 'string'
        },
        SUPABASE_ANON_KEY: {
            type: 'string'
        },
        DATABASE_URL: {
            type: 'string'
        }
    }
};

// Register env plugin first to load environment variables
await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
});

// Register other plugins
await fastify.register(corsPlugin);
await fastify.register(rateLimitPlugin);
await fastify.register(multipartPlugin);
await fastify.register(authPlugin);

// Register routes
const authRoutes = await import('./routes/auth.js');
await fastify.register(authRoutes.default, { prefix: '/api/auth' });

const usersRoutes = await import('./routes/users.js');
await fastify.register(usersRoutes.default, { prefix: '/api/users' });

const contactsRoutes = await import('./routes/contacts.js');
await fastify.register(contactsRoutes.default, { prefix: '/api/contacts' });

const contactGroupsRoutes = await import('./routes/contact-groups.js');
await fastify.register(contactGroupsRoutes.default, { prefix: '/api/contact-groups' });

const messagesRoutes = await import('./routes/messages.js');
await fastify.register(messagesRoutes.default, { prefix: '/api' });

const filesRoutes = await import('./routes/files.js');
await fastify.register(filesRoutes.default, { prefix: '/api/files' });

const aiRoutes = await import('./routes/ai.js');
await fastify.register(aiRoutes.default, { prefix: '/api/ai' });

const botRoutes = await import('./routes/bot.js');
await fastify.register(botRoutes.default, { prefix: '/api' });

const newsRoutes = await import('./routes/news.js');
await fastify.register(newsRoutes.default, { prefix: '/api/news' });

const callsRoutes = await import('./routes/calls.js');
await fastify.register(callsRoutes.default, { prefix: '/api/calls' });

// Health check endpoint
fastify.get('/health', async () => {
    return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
    };
});

// Global error handler - logs all errors before sending response
fastify.setErrorHandler((error, request, reply) => {
    // Log the full error with stack trace
    fastify.log.error(
        {
            err: error,
            url: request.url,
            method: request.method,
            statusCode: reply.statusCode,
        },
        'Unhandled error'
    );

    // Send error response
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || 'Internal server error';

    reply.status(statusCode).send({
        success: false,
        error: errorMessage,
    });
});

// Root endpoint
fastify.get('/', async () => {
    return {
        success: true,
        message: 'Spirit Messenger Backend Service',
        version: '1.0.0',
    };
});

// Global reference to workers
let callTimeoutWorker: Worker | null = null;

// Graceful shutdown handler
const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    await stopPresenceListener();
    if (callTimeoutWorker) {
        await callTimeoutWorker.close();
    }
    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '6666', 10);
        const host = process.env.HOST || '0.0.0.0';

        await fastify.listen({ port, host });

        // Start presence listener after server is ready
        await startPresenceListener();

        // Start call timeout worker for handling missed call timeouts
        callTimeoutWorker = createCallTimeoutWorker();

        console.log(`🚀 Backend service running on http://${host}:${port}`);
        console.log(`📊 Health check available at http://${host}:${port}/health`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
