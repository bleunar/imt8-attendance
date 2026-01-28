/**
 * Authentication service for Core Attendance application
 */

import api, { setAccessToken } from './api';
import type { LoginRequest, TokenResponse, MessageResponse } from '@/types';

export const authService = {
    /**
     * Login with identifier (email or school_id) and password
     */
    async login(data: LoginRequest): Promise<TokenResponse> {
        const response = await api.post<TokenResponse>('/auth/login', data);
        setAccessToken(response.data.access_token);
        return response.data;
    },

    /**
     * Logout and clear tokens
     */
    async logout(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } finally {
            setAccessToken(null);
        }
    },

    /**
     * Refresh access token using refresh token cookie
     */
    async refreshToken(): Promise<TokenResponse> {
        const response = await api.post<TokenResponse>('/auth/refresh');
        setAccessToken(response.data.access_token);
        return response.data;
    },

    /**
     * Request password recovery OTP
     */
    async requestRecovery(email: string): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>('/auth/recovery/request', { email });
        return response.data;
    },

    /**
     * Verify OTP and reset password
     */
    async verifyRecovery(email: string, otp: string, newPassword: string): Promise<MessageResponse> {
        const response = await api.post<MessageResponse>('/auth/recovery/verify', {
            email,
            otp,
            new_password: newPassword,
        });
        return response.data;
    },
};

export default authService;
