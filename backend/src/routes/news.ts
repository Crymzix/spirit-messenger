import { FastifyPluginAsync } from 'fastify';
import { redisConnection } from '../config/queue.js';
import type { ApiResponse } from '../types/index.js';

// NewsAPI types
export interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}

export interface TopHeadlinesResponse {
    status: string;
    totalResults: number;
    articles: NewsArticle[];
}

const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const CACHE_KEY = 'news:top-headlines:us';
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

async function fetchTopHeadlines(): Promise<TopHeadlinesResponse> {
    const response = await fetch(
        `${NEWS_API_BASE_URL}/top-headlines?country=us&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    return response.json() as Promise<TopHeadlinesResponse>;
}

async function getCachedHeadlines(): Promise<TopHeadlinesResponse | null> {
    try {
        const cached = await redisConnection.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as TopHeadlinesResponse;
        }
    } catch (error) {
        console.error('Error retrieving cached headlines:', error);
    }
    return null;
}

async function setCachedHeadlines(data: TopHeadlinesResponse): Promise<void> {
    try {
        await redisConnection.setex(
            CACHE_KEY,
            CACHE_TTL,
            JSON.stringify(data)
        );
    } catch (error) {
        console.error('Error caching headlines:', error);
    }
}

const newsRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /api/news/top-headlines
    fastify.get<{
        Reply: ApiResponse<TopHeadlinesResponse>;
    }>(
        '/top-headlines',
        async (_request, reply) => {
            try {
                if (!NEWS_API_KEY) {
                    return reply.status(400).send({
                        success: false,
                        error: 'NEWS_API_KEY environment variable is not configured'
                    });
                }

                // Try to get from cache first
                let headlines = await getCachedHeadlines();

                if (!headlines) {
                    // Fetch from NewsAPI if not in cache
                    headlines = await fetchTopHeadlines();

                    // Cache the results
                    await setCachedHeadlines(headlines);

                    return reply.status(200).send({
                        success: true,
                        data: headlines,
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: headlines,
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch top headlines'
                });
            }
        }
    );

    // GET /api/news/top-headlines/refresh
    fastify.get<{
        Reply: ApiResponse<TopHeadlinesResponse>;
    }>(
        '/top-headlines/refresh',
        async (_request, reply) => {
            try {
                if (!NEWS_API_KEY) {
                    return reply.status(400).send({
                        success: false,
                        error: 'NEWS_API_KEY environment variable is not configured'
                    });
                }

                // Force fetch fresh data from NewsAPI
                const headlines = await fetchTopHeadlines();

                // Update cache
                await setCachedHeadlines(headlines);

                return reply.status(200).send({
                    success: true,
                    data: headlines,
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to refresh headlines'
                });
            }
        }
    );
};

export default newsRoutes;
