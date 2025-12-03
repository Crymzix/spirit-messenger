import { FastifyPluginAsync } from 'fastify';

interface KlipyResponse {
    result: boolean;
    data?: {
        data?: Array<{
            id: number;
            title: string;
            file?: {
                hd?: { gif?: { url: string; width: number; height: number }; webp?: { url: string; width: number; height: number }; jpg?: { url: string; width: number; height: number }; png?: { url: string; width: number; height: number } };
                md?: { gif?: { url: string; width: number; height: number }; webp?: { url: string; width: number; height: number }; jpg?: { url: string; width: number; height: number }; png?: { url: string; width: number; height: number } };
                sm?: { gif?: { url: string; width: number; height: number }; webp?: { url: string; width: number; height: number }; jpg?: { url: string; width: number; height: number }; png?: { url: string; width: number; height: number } };
                xs?: { gif?: { url: string; width: number; height: number }; webp?: { url: string; width: number; height: number }; jpg?: { url: string; width: number; height: number }; png?: { url: string; width: number; height: number } };
            };
        }>;
        has_next?: boolean;
    };
}

const mediaRoutes: FastifyPluginAsync = async (fastify) => {
    // Get trending GIFs
    fastify.get('/media/gifs/trending', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/gifs/trending?per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to fetch trending GIFs');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.gif?.url || item.file?.hd?.gif?.url || '',
                    preview: item.file?.sm?.gif?.url || item.file?.xs?.gif?.url || '',
                    title: item.title,
                    width: item.file?.md?.gif?.width,
                    height: item.file?.md?.gif?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to fetch trending GIFs',
            });
        }
    });

    // Search GIFs
    fastify.get('/media/gifs/search', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { q, limit = 20, offset = 0 } = request.query as { q: string; limit?: number; offset?: number };

            if (!q) {
                return reply.status(400).send({
                    success: false,
                    error: 'Search query is required',
                });
            }

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/gifs/search?q=${encodeURIComponent(q)}&per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to search GIFs');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.gif?.url || item.file?.hd?.gif?.url || '',
                    preview: item.file?.sm?.gif?.url || item.file?.xs?.gif?.url || '',
                    title: item.title,
                    width: item.file?.md?.gif?.width,
                    height: item.file?.md?.gif?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to search GIFs',
            });
        }
    });

    // Get trending stickers
    fastify.get('/media/stickers/trending', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/stickers/trending?per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to fetch trending stickers');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.webp?.url || item.file?.hd?.webp?.url || '',
                    preview: item.file?.sm?.webp?.url || item.file?.xs?.webp?.url || '',
                    title: item.title,
                    width: item.file?.md?.webp?.width,
                    height: item.file?.md?.webp?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to fetch trending stickers',
            });
        }
    });

    // Search stickers
    fastify.get('/media/stickers/search', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { q, limit = 20, offset = 0 } = request.query as { q: string; limit?: number; offset?: number };

            if (!q) {
                return reply.status(400).send({
                    success: false,
                    error: 'Search query is required',
                });
            }

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/stickers/search?q=${encodeURIComponent(q)}&per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to search stickers');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.webp?.url || item.file?.hd?.webp?.url || '',
                    preview: item.file?.sm?.webp?.url || item.file?.xs?.webp?.url || '',
                    title: item.title,
                    width: item.file?.md?.webp?.width,
                    height: item.file?.md?.webp?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to search stickers',
            });
        }
    });

    // Get trending memes
    fastify.get('/media/memes/trending', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/static-memes/trending?per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to fetch trending memes');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.jpg?.url || item.file?.hd?.jpg?.url || item.file?.md?.png?.url || '',
                    preview: item.file?.sm?.jpg?.url || item.file?.xs?.jpg?.url || item.file?.md?.png?.url || '',
                    title: item.title,
                    width: item.file?.md?.jpg?.width,
                    height: item.file?.md?.jpg?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to fetch trending memes',
            });
        }
    });

    // Search memes
    fastify.get('/media/memes/search', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        try {
            const { q, limit = 20, offset = 0 } = request.query as { q: string; limit?: number; offset?: number };

            if (!q) {
                return reply.status(400).send({
                    success: false,
                    error: 'Search query is required',
                });
            }

            const response = await fetch(
                `https://api.klipy.com/api/v1/${process.env.KLIPY_API_KEY || ''}/static-memes/search?q=${encodeURIComponent(q)}&per_page=${limit}&page=${offset}`,
            );

            if (!response.ok) {
                throw new Error('Failed to search memes');
            }

            const klipyData = await response.json() as KlipyResponse;

            // Transform Klipy response to our format
            const transformedData = {
                results: klipyData.data?.data?.map((item) => ({
                    id: item.id.toString(),
                    url: item.file?.md?.jpg?.url || item.file?.hd?.jpg?.url || '',
                    preview: item.file?.sm?.jpg?.url || item.file?.xs?.jpg?.url || '',
                    title: item.title,
                    width: item.file?.md?.jpg?.width,
                    height: item.file?.md?.jpg?.height,
                })) || [],
                hasNext: klipyData.data?.has_next || false,
            };

            return reply.send({ success: true, data: transformedData });
        } catch (error: any) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error.message || 'Failed to search memes',
            });
        }
    });
};

export default mediaRoutes;
