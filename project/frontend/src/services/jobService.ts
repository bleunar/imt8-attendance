/**
 * Job service for Core Attendance application
 */

import api from './api';
import type { Job, JobCreate, JobUpdate, JobListResponse, AccountJob, MessageResponse, JobFilters } from '@/types';



export const jobService = {
    /**
     * List all jobs with filters
     */
    async list(filters: JobFilters = {}): Promise<JobListResponse> {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.department) params.append('department', filters.department);
        if (filters.search) params.append('search', filters.search);

        const response = await api.get<JobListResponse>(`/jobs?${params.toString()}`);
        return response.data;
    },

    /**
     * Get job by ID
     */
    async get(id: number): Promise<Job> {
        const response = await api.get<Job>(`/jobs/${id}`);
        return response.data;
    },

    /**
     * Create new job
     */
    async create(data: JobCreate): Promise<Job> {
        const response = await api.post<Job>('/jobs', data);
        return response.data;
    },

    /**
     * Update job
     */
    async update(id: number, data: JobUpdate): Promise<Job> {
        const response = await api.put<Job>(`/jobs/${id}`, data);
        return response.data;
    },

    /**
     * Delete job
     */
    async delete(id: number): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>(`/jobs/${id}`);
        return response.data;
    },

    /**
     * List assignments for a job
     */
    async listAssignments(jobId: number): Promise<AccountJob[]> {
        const response = await api.get<AccountJob[]>(`/jobs/${jobId}/assignments`);
        return response.data;
    },

    /**
     * Assign job to account
     */
    async assign(jobId: number, accountId: number, expiresAt?: string): Promise<AccountJob> {
        const response = await api.post<AccountJob>(`/jobs/${jobId}/assign`, {
            account_id: accountId,
            expires_at: expiresAt,
        });
        return response.data;
    },

    /**
     * Unassign job from account
     */
    async unassign(jobId: number, accountId: number): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>(`/jobs/${jobId}/unassign/${accountId}`);
        return response.data;
    },
    /**
     * Bulk assign job to accounts
     */
    async assignBulk(jobId: number, accountIds: number[], expiresAt?: string): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>(`/jobs/${jobId}/assign/bulk`, {
            account_ids: accountIds,
            expires_at: expiresAt,
        });
        return response.data;
    },

    /**
     * Bulk unassign job from accounts
     */
    async unassignBulk(jobId: number, accountIds: number[]): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>(`/jobs/${jobId}/unassign/bulk`, {
            account_ids: accountIds,
        });
        return response.data;
    },
};

export default jobService;
