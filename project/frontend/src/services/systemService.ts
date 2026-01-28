/**
 * System services for Core Attendance application
 */

import api from './api';

export interface SystemStatus {
    email_service: string;
    database: string;
    scheduler: {
        status: string;
        jobs: {
            id: string;
            name: string;
            next_run: string | null;
        }[];
    };
    status: string;
}

export const systemService = {
    /**
     * Check system status
     */
    async getStatus(): Promise<SystemStatus> {
        const response = await api.get<SystemStatus>('/system/status');
        return response.data;
    }
};

export default systemService;
