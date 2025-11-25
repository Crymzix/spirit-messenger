/**
 * News service for fetching top headlines
 */

import { apiGet } from '../api-client';

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

/**
 * Get top headlines (cached for 24 hours)
 */
export async function getTopHeadlines(): Promise<TopHeadlinesResponse> {
    const response = await apiGet<TopHeadlinesResponse>('/api/news/top-headlines');

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch top headlines');
    }

    return response.data;
}

/**
 * Refresh top headlines (bypass cache)
 */
export async function refreshTopHeadlines(): Promise<TopHeadlinesResponse> {
    const response = await apiGet<TopHeadlinesResponse>('/api/news/top-headlines/refresh');

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to refresh headlines');
    }

    return response.data;
}
