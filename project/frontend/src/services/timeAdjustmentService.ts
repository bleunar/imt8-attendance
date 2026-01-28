/**
 * Time Adjustment Service
 * Handles CRUD operations for student time adjustments.
 */

import api from './api';
import type { TimeAdjustment, TimeAdjustmentCreate, TimeAdjustmentListResponse } from '@/types';

export const timeAdjustmentService = {
    /**
     * Create a new time adjustment.
     */
    async create(data: TimeAdjustmentCreate): Promise<TimeAdjustment> {
        const response = await api.post('/time-adjustments/', data);
        return response.data;
    },

    /**
     * List time adjustments, optionally filtered by account_id.
     */
    async list(params: { account_id?: number; page?: number; page_size?: number } = {}): Promise<TimeAdjustmentListResponse> {
        const response = await api.get('/time-adjustments/', { params });
        return response.data;
    },

    /**
     * Delete a time adjustment (Admin only).
     */
    async remove(id: number): Promise<void> {
        await api.delete(`/time-adjustments/${id}`);
    }
};
