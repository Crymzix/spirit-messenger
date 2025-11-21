/**
 * Bot service for fetching AI bots
 */

import { apiGet } from '../api-client';
import type { Bot } from '@/types';

export interface GetBotsResponse {
    bots: Bot[];
}

/**
 * Get all available bots
 */
export async function getBots(): Promise<GetBotsResponse> {
    const response = await apiGet<GetBotsResponse>('/api/bots');

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch bots');
    }

    return response.data;
}
