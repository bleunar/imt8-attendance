import api from './api';
import type { PerformanceResponse, PerformanceFilters } from '@/types';

export const performanceService = {
    /**
     * Get performance statistics
     */
    async getStats(filters?: PerformanceFilters): Promise<PerformanceResponse> {
        const response = await api.get<PerformanceResponse>('/performance/', { params: filters });
        return response.data;
    },
};

export default performanceService;
