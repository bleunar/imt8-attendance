/**
 * Activity Logs Page
 * 
 * View attendance history and activity logs.
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
import { columns } from '@/components/dashboard/attendance/columns';
import { attendanceService } from '@/services/attendanceService';
import type { ActivityListResponse, ActivityRecord } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    Ban,
    RefreshCcw,
    Trash2,
    Pencil,
    X
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'specific' | 'all';

const getLocalYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AttendancePage() {
    const [data, setData] = useState<ActivityListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState<DatePreset>('today');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filters, setFilters] = useState<any>({
        page: 1,
        page_size: 15,
        date_from: getLocalYMD(new Date()),
        date_to: getLocalYMD(new Date()),
    });
    const [rowSelection, setRowSelection] = useState({});

    // Bulk Action Dialog States
    const [isBulkInvalidateOpen, setIsBulkInvalidateOpen] = useState(false);
    const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [invalidationNotes, setInvalidationNotes] = useState('');
    const [adjustTimeIn, setAdjustTimeIn] = useState('');
    const [adjustDateIn, setAdjustDateIn] = useState('');
    const [adjustTimeOut, setAdjustTimeOut] = useState('');
    const [adjustDateOut, setAdjustDateOut] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);

    // Derived Selection Data
    const selectedIds = Object.keys(rowSelection)
        .map(idx => data?.items[parseInt(idx)]?.id)
        .filter((id): id is number => !!id);

    const selectedRecords = Object.keys(rowSelection)
        .map(idx => data?.items[parseInt(idx)])
        .filter((r): r is ActivityRecord => !!r);

    const allSelectedActive = selectedRecords.length > 0 && selectedRecords.every(r => !r.time_out);
    const allSelectedCompleted = selectedRecords.length > 0 && selectedRecords.every(r => r.time_out && !r.invalidated_at);
    const allSelectedInvalid = selectedRecords.length > 0 && selectedRecords.every(r => r.invalidated_at);

    // Bulk Handlers
    const handleBulkClose = async () => {
        if (!confirm(`Are you sure you want to close ${selectedRecords.length} active sessions?`)) return;
        setBulkLoading(true);
        try {
            await attendanceService.bulkClose(selectedIds);
            toast.success('Sessions closed successfully');
            setRowSelection({});
            fetchActivities();
        } catch (error) {
            toast.error('Failed to close sessions');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkRevalidate = async () => {
        if (!confirm(`Are you sure you want to revalidate ${selectedRecords.length} records?`)) return;
        setBulkLoading(true);
        try {
            await attendanceService.bulkRevalidate(selectedIds);
            toast.success('Records revalidated successfully');
            setRowSelection({});
            fetchActivities();
        } catch (error) {
            toast.error('Failed to revalidate records');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkLoading(true);
        try {
            await attendanceService.bulkDelete(selectedIds);
            toast.success('Records deleted permanently');
            setRowSelection({});
            setIsBulkDeleteOpen(false);
            fetchActivities();
        } catch (error) {
            toast.error('Failed to delete records');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkInvalidate = async () => {
        if (!invalidationNotes.trim()) {
            toast.error('Please provide a reason');
            return;
        }
        setBulkLoading(true);
        try {
            await attendanceService.bulkInvalidate(selectedIds, invalidationNotes);
            toast.success('Records invalidated successfully');
            setRowSelection({});
            setInvalidationNotes('');
            setIsBulkInvalidateOpen(false);
            fetchActivities();
        } catch (error) {
            toast.error('Failed to invalidate records');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkAdjust = async () => {
        setBulkLoading(true);
        try {
            const constructISO = (date: string, time: string) => {
                if (!date || !time) return undefined;
                const [y, m, d] = date.split('-').map(Number);
                const [h, min] = time.split(':').map(Number);
                return new Date(y, m - 1, d, h, min).toISOString();
            }

            const inISO = constructISO(adjustDateIn, adjustTimeIn);
            const outISO = constructISO(adjustDateOut, adjustTimeOut);

            // Only send if not empty
            await attendanceService.bulkAdjust(selectedIds, inISO, outISO);
            toast.success('Records adjusted successfully');
            setRowSelection({});
            setAdjustTimeIn('');
            setAdjustDateIn('');
            setAdjustTimeOut('');
            setAdjustDateOut('');
            setIsBulkAdjustOpen(false);
            fetchActivities();
        } catch (error) {
            toast.error('Failed to adjust records');
        } finally {
            setBulkLoading(false);
        }
    };

    const calculateDateRange = (preset: DatePreset) => {
        const today = new Date();
        // Reset to strict start of day for calculations if needed, mostly we just manipulate dates

        switch (preset) {
            case 'all':
                return {
                    date_from: undefined,
                    date_to: undefined
                };
            case 'today':
                return {
                    date_from: getLocalYMD(today),
                    date_to: getLocalYMD(today)
                };
            case 'yesterday':
                const yest = new Date(today);
                yest.setDate(today.getDate() - 1);
                return {
                    date_from: getLocalYMD(yest),
                    date_to: getLocalYMD(yest)
                };
            case 'week':
                // "This Week" (Start Sunday or Monday? Standard is usually Sunday in simpler apps, or Monday. Let's assume Sunday start).
                const day = today.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = today.getDate() - day; // First day is Sunday

                const startOfWeek = new Date(today);
                startOfWeek.setDate(diff);
                // "This Week" usually implies "up to today" or "whole week"? Let's do start of week to today.
                return {
                    date_from: getLocalYMD(startOfWeek),
                    date_to: getLocalYMD(today)
                };
            case 'month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    date_from: getLocalYMD(startOfMonth),
                    date_to: getLocalYMD(today)
                };
            case 'specific':
                // Keep current values or default to today? Default to today if switching into it.
                // Actually logic calls this when preset changes.
                return {
                    date_from: getLocalYMD(today),
                    date_to: getLocalYMD(today)
                };
            case 'custom':
                return null;
        }
    };

    const handlePresetChange = (value: DatePreset) => {
        setPreset(value);
        if (value !== 'custom') {
            const range = calculateDateRange(value);
            if (range) {
                setFilters((prev: any) => ({
                    ...prev,
                    page: 1, // Reset page
                    ...range
                }));
            }
        }
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            // Transform Local YYYY-MM-DD to UTC ISO Range
            // Backend expects ISO strings.
            // If we send YYYY-MM-DD, backend treats as 00:00 UTC (often).
            // We want 00:00 LOCAL -> UTC.
            let apiFrom = undefined;
            let apiTo = undefined;

            if (filters.date_from) {
                const [y, m, d] = filters.date_from.split('-').map(Number);
                const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
                apiFrom = localStart.toISOString();
            }

            if (filters.date_to) {
                const [y, m, d] = filters.date_to.split('-').map(Number);
                // End of day
                const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
                apiTo = localEnd.toISOString();
            }

            const response = await attendanceService.list({
                ...filters,
                date_from: apiFrom,
                date_to: apiTo,
                sort_by: 'time_in',
                sort_order: sortOrder,
            });
            setData(response);
        } catch (error) {
            toast.error('Failed to fetch activity logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.page_size, filters.date_from, filters.date_to, sortOrder]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Attendance Logs</h2>
                    <p className="text-muted-foreground">
                        List of all the attendances recorded
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
                                        value={filters.date_from} // In specific mode, from=to usually
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
                        columns={columns}
                        data={data?.items || []}
                        isLoading={loading}
                        pagination={{
                            currentPage: filters.page,
                            totalPages: data?.total_pages || 1,
                            onPageChange: (page) => setFilters((prev: any) => ({ ...prev, page }))
                        }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        meta={{ refreshData: fetchActivities }}
                    />
                </CardContent>
            </Card>

            {/* Floating Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-0 md:left-64 right-0 z-50 flex justify-center px-4 pointer-events-none">
                    <div className="w-full max-w-4xl animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
                        <div className="bg-background/95 backdrop-blur-lg border-2 border-primary/20 shadow-2xl rounded-xl p-2 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 mr-auto pl-2">
                                <div className="font-semibold">{selectedIds.length} selected</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setRowSelection({})} className="h-6 px-2 text-muted-foreground hover:bg-muted">
                                    <X className="h-3 w-3 md:mr-1" /> <span className="hidden md:inline">Clear</span>
                                </Button>
                                {allSelectedActive && (
                                    <Button size="sm" onClick={handleBulkClose} disabled={bulkLoading} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Close Sessions</span>
                                    </Button>
                                )}

                                {allSelectedCompleted && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => setIsBulkAdjustOpen(true)} disabled={bulkLoading}>
                                            <Pencil className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Adjust Time</span>
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => setIsBulkInvalidateOpen(true)} disabled={bulkLoading}>
                                            <Ban className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Invalidate</span>
                                        </Button>
                                    </>
                                )}

                                {allSelectedInvalid && (
                                    <Button size="sm" onClick={handleBulkRevalidate} disabled={bulkLoading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                        <RefreshCcw className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Revalidate</span>
                                    </Button>
                                )}

                                <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)} disabled={bulkLoading} className="shadow-sm">
                                    <Trash2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Delete</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Invalidate Dialog */}
            <Dialog open={isBulkInvalidateOpen} onOpenChange={setIsBulkInvalidateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invalidate {selectedIds.length} Records</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for invalidating these records.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Reason / Notes</Label>
                        <Textarea
                            value={invalidationNotes}
                            onChange={(e) => setInvalidationNotes(e.target.value)}
                            placeholder="e.g. System error, Duplicate entry..."
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkInvalidateOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleBulkInvalidate} disabled={bulkLoading}>Invalidate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selectedIds.length} Records Permanently</DialogTitle>
                        <DialogDescription>
                            Are you sure? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>Delete Permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Adjust Dialog */}
            <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Time for {selectedIds.length} Records</DialogTitle>
                        <DialogDescription>
                            Set a new Time In or Time Out timestamp for all selected records.
                            <br />
                            <span className="text-xs text-yellow-600 font-bold">Note: Both Date and Time are required to set a value. This overwrites existing timestamps.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date In</Label>
                                <Input
                                    type="date"
                                    value={adjustDateIn}
                                    onChange={(e) => setAdjustDateIn(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time In</Label>
                                <Input
                                    type="time"
                                    value={adjustTimeIn}
                                    onChange={(e) => setAdjustTimeIn(e.target.value)}
                                />
                            </div>
                        </div>

                        <hr></hr>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date Out</Label>
                                <Input
                                    type="date"
                                    value={adjustDateOut}
                                    onChange={(e) => setAdjustDateOut(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time Out</Label>
                                <Input
                                    type="time"
                                    value={adjustTimeOut}
                                    onChange={(e) => setAdjustTimeOut(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkAdjustOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkAdjust} disabled={bulkLoading}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
