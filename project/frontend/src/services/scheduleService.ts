import api from './api';

export interface ScheduleOverride {
    id: number;
    account_id: number;
    date: string;
    request_notes: string;
    response_notes?: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    created_at: string;
    first_name?: string;
    last_name?: string;
}

export interface DailyOverview {
    date: string;
    scheduled: Array<{ account_id: number, first_name: string, last_name: string, job_name?: string }>;
    activity: Array<{ account_id: number, time_in: string, time_out?: string }>;
    requests: ScheduleOverride[];
}

export const scheduleService = {
    async getMySchedule() {
        const response = await api.get<{ schedule: { weekdays: number[] }, overrides: ScheduleOverride[] }>('/schedules/my');
        return response.data;
    },

    async createRequest(data: { date: string, request_notes: string }) {
        const response = await api.post<ScheduleOverride>('/schedules/requests', data);
        return response.data;
    },

    async getOverview(dateQuery: string): Promise<DailyOverview> {
        const response = await api.get<DailyOverview>(`/schedules/overview?date_query=${dateQuery}`);
        return response.data;
    }
};
