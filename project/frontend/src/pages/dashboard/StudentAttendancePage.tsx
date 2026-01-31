/**
 * Student Attendance Page
 * 
 * Allows students to view their own attendance history.
 * This is a read-only view with no management controls.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DataTable } from '@/components/ui/data-table';
import { studentColumns } from '@/components/dashboard/attendance/studentColumns';
import { attendanceService } from '@/services/attendanceService';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityListResponse } from '@/types';
import { toast } from 'sonner';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'specific' | 'all';

const getLocalYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function StudentAttendancePage() {
    const { user } = useAuth();
    const [data, setData] = useState<ActivityListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState<DatePreset>('month');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Calculate initial month range
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [filters, setFilters] = useState<any>({
        page: 1,
        page_size: 15,
        date_from: getLocalYMD(startOfMonth),
        date_to: getLocalYMD(today),
    });

    const calculateDateRange = (preset: DatePreset) => {
        const today = new Date();

        switch (preset) {
            case 'all':
                return { date_from: undefined, date_to: undefined };
            case 'today':
                return { date_from: getLocalYMD(today), date_to: getLocalYMD(today) };
            case 'yesterday':
                const yest = new Date(today);
                yest.setDate(today.getDate() - 1);
                return { date_from: getLocalYMD(yest), date_to: getLocalYMD(yest) };
            case 'week':
                const day = today.getDay();
                const diff = today.getDate() - day;
                const startOfWeek = new Date(today);
                startOfWeek.setDate(diff);
                return { date_from: getLocalYMD(startOfWeek), date_to: getLocalYMD(today) };
            case 'month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return { date_from: getLocalYMD(startOfMonth), date_to: getLocalYMD(today) };
            case 'specific':
                return { date_from: getLocalYMD(today), date_to: getLocalYMD(today) };
            case 'custom':
                return null;
        }
    };

    const handlePresetChange = (value: DatePreset) => {
        setPreset(value);
        if (value !== 'custom') {
            const range = calculateDateRange(value);
            if (range) {
                setFilters((prev: any) => ({ ...prev, page: 1, ...range }));
            }
        }
    };

    const fetchActivities = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            let apiFrom = undefined;
            let apiTo = undefined;

            if (filters.date_from) {
                const [y, m, d] = filters.date_from.split('-').map(Number);
                const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
                apiFrom = localStart.toISOString();
            }

            if (filters.date_to) {
                const [y, m, d] = filters.date_to.split('-').map(Number);
                const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
                apiTo = localEnd.toISOString();
            }

            const response = await attendanceService.getStudentActivities(
                user.id,
                filters.page,
                filters.page_size,
                apiFrom,
                apiTo
            );
            setData(response);
        } catch (error) {
            toast.error('Failed to fetch your attendance history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.page_size, filters.date_from, filters.date_to, sortOrder, user?.id]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Attendance</h2>
                    <p className="text-muted-foreground">
                        View your attendance history
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>Attendance History</CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={filters.page_size.toString()}
                                onValueChange={(v) => setFilters((prev: any) => ({ ...prev, page_size: Number(v), page: 1 }))}
                            >
                                <SelectTrigger className="w-[80px]">
                                    <SelectValue placeholder="Size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desc">Newest</SelectItem>
                                    <SelectItem value="asc">Oldest</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Specific Day Input */}
                            {preset === 'specific' && (
                                <div className="space-y-1">
                                    <Input
                                        type="date"
                                        value={filters.date_from}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFilters((prev: any) => ({ ...prev, date_from: val, date_to: val, page: 1 }));
                                        }}
                                        className="w-40"
                                    />
                                </div>
                            )}

                            {preset === 'custom' && (
                                <>
                                    <div className="space-y-1">
                                        <Input
                                            type="date"
                                            value={filters.date_from}
                                            onChange={(e) => setFilters((prev: any) => ({ ...prev, date_from: e.target.value, page: 1 }))}
                                            className="w-40"
                                        />
                                    </div>
                                    <span className="text-muted-foreground">-</span>
                                    <div className="space-y-1">
                                        <Input
                                            type="date"
                                            value={filters.date_to}
                                            onChange={(e) => setFilters((prev: any) => ({ ...prev, date_to: e.target.value, page: 1 }))}
                                            className="w-40"
                                        />
                                    </div>
                                </>
                            )}

                            <Select value={preset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="yesterday">Yesterday</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="specific">Specific Day</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={studentColumns}
                        data={data?.items || []}
                        isLoading={loading}
                        pagination={{
                            currentPage: filters.page,
                            totalPages: data?.total_pages || 1,
                            onPageChange: (page) => setFilters((prev: any) => ({ ...prev, page }))
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
