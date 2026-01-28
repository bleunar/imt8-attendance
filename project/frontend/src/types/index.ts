/**
 * TypeScript types for Core Attendance application
 */

// User and Authentication types
export interface User {
    id: number;
    role: 'admin' | 'manager' | 'student';
    department: string | null;
    school_id: string | null;
    email: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    gender: string | null;
    course: string | null;
    year_level: number | null;
    created_at: string;
    updated_at: string | null;
    suspended_at: string | null;
    current_job?: string | null;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface LoginRequest {
    identifier: string;
    password: string;
}

// Account types
export interface AccountCreate {
    role: 'admin' | 'manager' | 'student';
    department?: string;
    school_id?: string;
    email: string;
    password: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: string;
    course?: string;
    year_level?: number;
}

export interface AccountUpdate {
    role?: 'admin' | 'manager' | 'student';
    department?: string;
    school_id?: string;
    email?: string;
    password?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: string;
    course?: string;
    year_level?: number;
}

export interface AccountListResponse {
    items: User[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

// Job types
export interface Job {
    id: number;
    department: string | null;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string | null;
    member_count: number;
}

export interface JobCreate {
    department?: string;
    name: string;
    description?: string;
}

export interface JobUpdate {
    department?: string;
    name?: string;
    description?: string;
}

export interface JobListResponse {
    items: Job[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface AccountJob {
    account_id: number;
    job_id: number;
    account_name: string | null;
    job_name: string | null;
    assigned_at: string;
    assigned_by: number | null;
    expires_at: string | null;
    department: string | null;
}

// Attendance types
export interface PunchRequest {
    school_id: string;
}

export interface PunchResponse {
    status: 'time_in' | 'time_out';
    timestamp: string;
    message: string;
    student_name: string | null;
}

export interface ActivityRecord {
    id: number;
    account_id: number;
    account_name: string | null;
    school_id: string | null;
    time_in: string | null;
    time_out: string | null;
    duration_minutes: number | null;
    properties: Record<string, unknown> | null;
    invalidated_at: string | null;
    invalidation_notes: string | null;
    created_at: string;
}

export interface ActivityUpdate {
    time_in?: string;
    time_out?: string;
    invalidation_notes?: string;
}

export interface ActivityInvalidate {
    notes: string;
}

export interface ActivityListResponse {
    items: ActivityRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface StudentSummary {
    account_id: number;
    account_name: string;
    school_id: string | null;
    total_sessions: number;
    total_minutes: number;
    total_hours: number;
}

export interface AttendanceSummaryResponse {
    items: StudentSummary[];
    total: number;
    date_from: string | null;
    date_to: string | null;
}

// API Response types
export interface MessageResponse {
    message: string;
    success: boolean;
}

export interface ApiError {
    detail: string;
}

export interface AccountFilters {
    page?: number;
    page_size?: number;
    role?: string;
    department?: string;
    search?: string;
}

export interface JobFilters {
    page?: number;
    page_size?: number;
    department?: string;
    search?: string;
}

export interface PerformanceStat {
    account_id: number;
    name: string;
    school_id: string | null;
    job_name?: string;
    is_online: boolean;
    total_rendered_hours: number;
    avg_daily_hours: number;
    avg_weekly_hours: number;
    adjustment_hours: number;
}

export interface PerformanceFilters {
    search?: string;
    job_id?: string;
    status?: 'all' | 'active' | 'inactive';
    role?: 'student' | 'manager' | 'all';
    suspended?: 'true' | 'false' | 'all';
}

export interface PerformanceResponse {
    items: PerformanceStat[];
    total: number;
}

// Time Adjustment types
export interface TimeAdjustment {
    id: number;
    account_id: number;
    manager_id: number | null;
    manager_name: string | null;
    adjustment_minutes: number;
    reason: string;
    created_at: string;
}

export interface TimeAdjustmentCreate {
    account_id: number;
    adjustment_minutes: number;
    reason: string;
}

export interface TimeAdjustmentListResponse {
    items: TimeAdjustment[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

