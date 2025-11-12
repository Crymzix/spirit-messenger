import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import authPlugin from './plugins/auth.js';
import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import multipartPlugin from './plugins/multipart.js';

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
            default: 6666
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

// Health check endpoint
fastify.get('/health', async () => {
    return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
    };
});

// Root endpoint
fastify.get('/', async () => {
    return {
        success: true,
        message: 'Spirit Messenger Backend Service',
        version: '1.0.0',
    };
});

// Start server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '6666', 10);
        const host = process.env.HOST || '0.0.0.0';

        await fastify.listen({ port, host });

        console.log(`🚀 Backend service running on http://${host}:${port}`);
        console.log(`📊 Health check available at http://${host}:${port}/health`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
