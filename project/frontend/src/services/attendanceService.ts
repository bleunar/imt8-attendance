/**
 * Attendance service for Core Attendance application
 */

import api from './api';
import type {
    PunchResponse,
    ActivityListResponse,
    AttendanceSummaryResponse,
    ActivityRecord,
    ActivityUpdate
} from '@/types';

export interface ActivityFilters {
    page?: number;
    page_size?: number;
    account_id?: string;
    date_from?: string;
    date_to?: string;
    active_only?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface SummaryFilters {
    date_from?: string;
    date_to?: string;
    department?: string;
}

export const attendanceService = {
    /**
     * Punch time in/out (public endpoint)
     */
    async punch(schoolId: string, forceEarlyTimeout: boolean = false): Promise<PunchResponse> {
        const response = await api.post<PunchResponse>('/attendance/punch', {
            school_id: schoolId,
            force_early_timeout: forceEarlyTimeout
        });
        return response.data;
    },

    /**
     * Get names of currently active students (public)
     */
    async getPublicActiveSessions(dateFrom?: string): Promise<string[]> {
        let url = '/attendance/public/active';
        if (dateFrom) {
            url += `?date_from=${dateFrom}`;
        }
        const response = await api.get<string[]>(url);
        return response.data;
    },

    /**
     * Get today's activity records (public)
     */
    async getPublicTodayActivity(dateFrom?: string): Promise<ActivityRecord[]> {
        let url = '/attendance/public/today';
        if (dateFrom) {
            url += `?date_from=${dateFrom}`;
        }
        const response = await api.get<ActivityRecord[]>(url);
        return response.data;
    },

    /**
     * List activity logs with filters
     */
    async list(filters: ActivityFilters = {}): Promise<ActivityListResponse> {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.account_id) params.append('account_id', filters.account_id.toString());
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.active_only) params.append('active_only', 'true');
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        const response = await api.get<ActivityListResponse>(`/attendance?${params.toString()}`);
        return response.data;
    },

    /**
     * Get student's activity history
     */
    async getStudentActivities(
        studentId: string,
        page = 1,
        pageSize = 20,
        dateFrom?: string,
        dateTo?: string
    ): Promise<ActivityListResponse> {
        let url = `/attendance/student/${studentId}?page=${page}&page_size=${pageSize}`;
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;

        const response = await api.get<ActivityListResponse>(url);
        return response.data;
    },

    /**
     * Get attendance summary
     */
    async getSummary(filters: SummaryFilters = {}): Promise<AttendanceSummaryResponse> {
        const params = new URLSearchParams();
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.department) params.append('department', filters.department);

        const response = await api.get<AttendanceSummaryResponse>(`/attendance/summary?${params.toString()}`);
        return response.data;
    },

    /**
     * Get currently active sessions
     */
    async getActiveSessions(): Promise<ActivityRecord[]> {
        const response = await api.get<ActivityRecord[]>('/attendance/active');
        return response.data;
    },

    async getOverdueCount(): Promise<number> {
        const response = await api.get<{ count: number }>('/attendance/overdue/count');
        return response.data.count;
    },

    /**
     * Update activity time in/out
     */
    async update(id: number, data: ActivityUpdate): Promise<ActivityRecord> {
        const response = await api.put<ActivityRecord>(`/attendance/${id}`, data);
        return response.data;
    },

    /**
     * Invalidate activity
     */
    async invalidate(id: number, notes: string): Promise<ActivityRecord> {
        const response = await api.put<ActivityRecord>(`/attendance/${id}/invalidate`, { notes });
        return response.data;
    },
    /**
     * Revalidate activity (clear invalidation)
     */
    async revalidate(id: number): Promise<ActivityRecord> {
        const response = await api.put<ActivityRecord>(`/attendance/${id}/revalidate`);
        return response.data;
    },
    /**
     * Delete activity permanently
     */
    async delete(id: number): Promise<void> {
        await api.delete(`/attendance/${id}`);
    },

    // --- Bulk Operations ---

    async bulkClose(ids: number[]): Promise<void> {
        await api.post('/attendance/bulk/close', { ids });
    },

    async bulkInvalidate(ids: number[], notes: string): Promise<void> {
        await api.post('/attendance/bulk/invalidate', { ids, notes });
    },

    async bulkRevalidate(ids: number[]): Promise<void> {
        await api.post('/attendance/bulk/revalidate', { ids });
    },

    async bulkDelete(ids: number[]): Promise<void> {
        await api.post('/attendance/bulk/delete', { ids });
    },

    async bulkAdjust(ids: number[], timeIn?: string, timeOut?: string): Promise<void> {
        await api.post('/attendance/bulk/adjust', {
            ids,
            time_in: timeIn,
            time_out: timeOut
        });
    },
};

export default attendanceService;
