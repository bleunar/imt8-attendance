/**
 * Account service for Core Attendance application
 */

import api from './api';
import type { User, AccountCreate, AccountUpdate, AccountListResponse, MessageResponse, AccountFilters } from '@/types';



export const accountService = {
    /**
     * List all accounts with filters
     */
    async list(filters: AccountFilters = {}): Promise<AccountListResponse> {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.role) params.append('role', filters.role);
        if (filters.department) params.append('department', filters.department);
        if (filters.search) params.append('search', filters.search);

        const response = await api.get<AccountListResponse>(`/accounts?${params.toString()}`);
        return response.data;
    },

    /**
     * Get account by ID
     */
    async get(id: number): Promise<User> {
        const response = await api.get<User>(`/accounts/${id}`);
        return response.data;
    },

    /**
     * Create new account
     */
    async create(data: AccountCreate): Promise<User> {
        const response = await api.post<User>('/accounts', data);
        return response.data;
    },

    /**
     * Update account
     */
    async update(id: number, data: AccountUpdate): Promise<User> {
        const response = await api.put<User>(`/accounts/${id}`, data);
        return response.data;
    },

    /**
     * Suspend account (soft delete)
     */
    async suspend(id: number): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>(`/accounts/${id}`);
        return response.data;
    },

    /**
     * Restore suspended account
     */
    async restore(id: number): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>(`/accounts/${id}/restore`);
        return response.data;
    },

    /**
     * Permanently delete account (hard delete)
     */
    async permanentDelete(id: number): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>(`/accounts/${id}/permanent`);
        return response.data;
    },

    /**
     * Get current user's profile
     */
    async getProfile(): Promise<User> {
        const response = await api.get<User>('/accounts/profile');
        return response.data;
    },

    /**
     * Update current user's profile
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await api.put<User>('/accounts/profile', data);
        return response.data;
    },

    /**
     * Update current user's password
     */
    async updatePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
        const response = await api.put<MessageResponse>('/accounts/profile/password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    },

    /**
     * Move up all eligible students to next semester/year
     */
    async moveUpStudents(): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>('/accounts/maintenance/move-up');
        return response.data;
    },

    // ========================================================================
    // Profile Picture Methods
    // ========================================================================

    /**
     * Upload profile picture for current user
     * @param file - Image file to upload
     * @param onProgress - Optional callback for upload progress (0-100)
     */
    async uploadProfilePicture(
        file: File,
        onProgress?: (percent: number) => void
    ): Promise<{ message: string; profile_picture: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<{ message: string; profile_picture: string }>(
            '/accounts/profile/picture',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percent);
                    }
                },
            }
        );
        return response.data;
    },

    /**
     * Remove current user's profile picture
     */
    async removeProfilePicture(): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>('/accounts/profile/picture');
        return response.data;
    },

    /**
     * Remove a user's profile picture (admin/manager only)
     */
    async removeUserProfilePicture(accountId: number): Promise<MessageResponse> {
        const response = await api.delete<MessageResponse>(`/accounts/${accountId}/picture`);
        return response.data;
    },
};

export default accountService;
