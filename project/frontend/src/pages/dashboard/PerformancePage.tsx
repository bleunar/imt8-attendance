import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/dashboard/performance/columns';
import { columns as activityColumns } from '@/components/dashboard/attendance/columns';
import { performanceService } from '@/services/performanceService';
import { attendanceService } from '@/services/attendanceService';
import { jobService } from '@/services/jobService';
import { timeAdjustmentService } from '@/services/timeAdjustmentService';
import type { PerformanceStat, ActivityRecord, PerformanceFilters, Job, TimeAdjustment } from '@/types';
import { Search, X, Ban, RefreshCcw, Trash2, CheckCircle2, Pencil } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BulkInvalidateDialog } from '@/components/dashboard/attendance/BulkInvalidateDialog';
import { BulkAdjustTimeDialog } from '@/components/dashboard/attendance/BulkAdjustTimeDialog';
import { AdjustmentDialog } from '@/components/dashboard/performance/AdjustmentDialog';

export default function PerformancePage() {
    // Data States
    const [data, setData] = useState<PerformanceStat[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<PerformanceFilters>({
        search: '',
        status: 'all',
    });

    // Activity History & Bulk Actions
    const [selectedStudent, setSelectedStudent] = useState<PerformanceStat | null>(null);
    const [studentHistory, setStudentHistory] = useState<ActivityRecord[]>([]);
    const [studentAdjustments, setStudentAdjustments] = useState<TimeAdjustment[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('activities');

    // Row Selection for Bulk Actions
    const [rowSelection, setRowSelection] = useState({});
    const [showBulkInvalidate, setShowBulkInvalidate] = useState(false);
    const [showBulkAdjust, setShowBulkAdjust] = useState(false);

    // Time Adjustment Dialog
    const [adjustStudent, setAdjustStudent] = useState<PerformanceStat | null>(null);

    // Initial Load: Fetch Jobs
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await jobService.list({ page_size: 100 });
                setJobs(response.items);
            } catch (error) {
                console.error('Failed to fetch jobs', error);
            }
        };
        fetchJobs();
    }, []);

    // Fetch Performance Data when filters change
    useEffect(() => {
        const fetchPerformance = async () => {
            setIsLoading(true);
            try {
                const response = await performanceService.getStats(filters);
                setData(response.items);
            } catch (error) {
                console.error('Failed to fetch performance stats', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchPerformance();
        }, 300);

        return () => clearTimeout(timer);
    }, [filters]);

    const handleViewHistory = async (student: PerformanceStat) => {
        setSelectedStudent(student);
        setIsHistoryLoading(true);
        setStudentHistory([]);
        setStudentAdjustments([]);
        setRowSelection({}); // Reset selection when opening new student
        setActiveTab('activities'); // Reset to activities tab
        try {
            // Fetch both activity history and adjustments in parallel
            const [activityResponse, adjustmentResponse] = await Promise.all([
                attendanceService.list({
                    account_id: student.account_id,
                    page: 1,
                    page_size: 100
                }),
                timeAdjustmentService.list({ account_id: student.account_id })
            ]);
            setStudentHistory(activityResponse.items);
            setStudentAdjustments(adjustmentResponse.items);
        } catch (error) {
            console.error('Failed to fetch student history', error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const refreshHistory = async () => {
        if (!selectedStudent) return;
        setIsHistoryLoading(true);
        try {
            const response = await attendanceService.list({
                account_id: selectedStudent.account_id,
                page: 1,
                page_size: 100
            });
            setStudentHistory(response.items);
            setRowSelection({}); // Clear selection after refresh
        } catch (error) {
            console.error('Failed to refresh history', error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    // Bulk Action Handlers
    const getSelectedIds = () => {
        return Object.keys(rowSelection).map(index => studentHistory[parseInt(index)]?.id).filter(id => id);
    };

    const getSelectedRecords = () => {
        return Object.keys(rowSelection).map(index => studentHistory[parseInt(index)]).filter(r => !!r);
    };

    const selectedIds = getSelectedIds();
    const selectedRecords = getSelectedRecords();
    const selectedCount = selectedIds.length;

    // Derived Selection States
    const allSelectedActive = selectedCount > 0 && selectedRecords.every(r => !r.time_out);
    const allSelectedCompleted = selectedCount > 0 && selectedRecords.every(r => r.time_out && !r.invalidated_at);
    const allSelectedInvalid = selectedCount > 0 && selectedRecords.every(r => r.invalidated_at);


    const handleBulkDelete = async () => {
        const ids = getSelectedIds();
        if (!ids.length) return;

        if (!confirm(`Are you sure you want to permanently delete ${ids.length} activities?`)) return;

        try {
            await attendanceService.bulkDelete(ids);
            toast.success(`${ids.length} activities deleted`);
            refreshHistory();
        } catch (error) {
            toast.error('Failed to delete activities');
        }
    };

    const handleBulkRevalidate = async () => {
        const ids = getSelectedIds();
        if (!ids.length) return;

        try {
            await attendanceService.bulkRevalidate(ids);
            toast.success(`${ids.length} activities revalidated`);
            refreshHistory();
        } catch (error) {
            toast.error('Failed to revalidate activities');
        }
    };

    const handleBulkClose = async () => {
        const ids = getSelectedIds();
        if (!ids.length) return;

        if (!confirm(`Are you sure you want to close ${ids.length} active sessions?`)) return;

        try {
            await attendanceService.bulkClose(ids);
            toast.success(`${ids.length} sessions closed`);
            refreshHistory();
        } catch (error) {
            toast.error('Failed to close sessions');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Performance Overview</h2>
                    <p className="text-muted-foreground">
                        Overview of the rendered time and attendance metrics.
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardContent>
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        {/* Search */}
                        <div className="flex-1 max-w-sm relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search student name..."
                                className="pl-9"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                            />
                        </div>

                        {/* Job Filter */}
                        <div>
                            <Select
                                value={filters.job_id?.toString() || "all"}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, job_id: val === "all" ? undefined : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Job" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Jobs</SelectItem>
                                    {jobs.map((job) => (
                                        <SelectItem key={job.id} value={job.id.toString()}>
                                            {job.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <Select
                                value={filters.status || "all"}
                                onValueChange={(val: any) => setFilters(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">On Duty</SelectItem>
                                    <SelectItem value="inactive">Off Duty</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <Select
                                value={filters.role || "student"}
                                onValueChange={(val: any) => setFilters(prev => ({ ...prev, role: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Students</SelectItem>
                                    <SelectItem value="manager">Managers</SelectItem>
                                    <SelectItem value="all">All Roles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Suspended Filter */}
                        <div>
                            <Select
                                value={filters.suspended || "false"}
                                onValueChange={(val: any) => setFilters(prev => ({ ...prev, suspended: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Suspension" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">Active Accounts</SelectItem>
                                    <SelectItem value="true">Suspended Only</SelectItem>
                                    <SelectItem value="all">All Accounts</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <DataTable
                        columns={columns({ onViewHistory: handleViewHistory, onAdjust: setAdjustStudent })}
                        data={data}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <Dialog
                open={!!selectedStudent}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedStudent(null);
                        setRowSelection({});
                    }
                }}
            >
                <DialogContent
                    className=' lg:max-w-5xl max-h-[85vh] overflow-y-auto scroll-m-0 top-[5%] translate-y-0'
                    onPointerDownOutside={(e) => {
                        // Prevent closing if clicking on the bulk actions toolbar
                        if (e.target instanceof Element && e.target.closest('#bulk-actions-toolbar')) {
                            e.preventDefault();
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Student History: {selectedStudent?.name}</DialogTitle>
                        <DialogDescription>
                            View activity logs and time adjustments for this student.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="activities">
                                Activities ({studentHistory.length})
                            </TabsTrigger>
                            <TabsTrigger value="adjustments">
                                Adjustments ({studentAdjustments.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="activities" className="mt-4">
                            {isHistoryLoading ? (
                                <div className="py-8 text-center text-muted-foreground">Loading history...</div>
                            ) : (
                                <DataTable
                                    columns={activityColumns}
                                    data={studentHistory}
                                    rowSelection={rowSelection}
                                    onRowSelectionChange={setRowSelection}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="adjustments" className="mt-4">
                            {isHistoryLoading ? (
                                <div className="py-8 text-center text-muted-foreground">Loading adjustments...</div>
                            ) : studentAdjustments.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">No adjustments found for this student.</div>
                            ) : (
                                <div className="rounded-md border">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="h-10 px-4 text-left font-medium">Date</th>
                                                <th className="h-10 px-4 text-left font-medium">Manager</th>
                                                <th className="h-10 px-4 text-left font-medium">Amount</th>
                                                <th className="h-10 px-4 text-left font-medium">Reason</th>
                                                <th className="h-10 px-4 text-left font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentAdjustments.map((adj) => (
                                                <tr key={adj.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-4 text-sm">
                                                        {new Date(adj.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 text-sm">
                                                        {adj.manager_name || 'Unknown'}
                                                    </td>
                                                    <td className="p-4 text-sm">
                                                        <span className={adj.adjustment_minutes >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                            {adj.adjustment_minutes >= 0 ? '+' : '-'}{Math.floor(Math.abs(adj.adjustment_minutes) / 60)}h {Math.abs(adj.adjustment_minutes) % 60}m
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm">{adj.reason}</td>
                                                    <td className="p-4 text-sm">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={async () => {
                                                                if (!confirm('Are you sure you want to delete this adjustment?')) return;
                                                                try {
                                                                    await timeAdjustmentService.remove(adj.id);
                                                                    toast.success('Adjustment deleted');
                                                                    // Refresh adjustments
                                                                    const response = await timeAdjustmentService.list({ account_id: selectedStudent!.account_id });
                                                                    setStudentAdjustments(response.items);
                                                                    // Refresh performance data
                                                                    setFilters({ ...filters });
                                                                } catch (error) {
                                                                    toast.error('Failed to delete adjustment');
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Floating Bulk Actions Toolbar - Positioned outside Dialog for Viewport alignment */}
            {selectedCount > 0 && activeTab === 'activities' && (
                <div className="fixed bottom-10 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
                    <div id="bulk-actions-toolbar" className="w-full max-w-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
                        <div className="bg-background/95 backdrop-blur-lg border-2 border-primary/20 shadow-2xl rounded-xl p-2 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 mr-auto pl-2">
                                <div className="font-semibold">{selectedCount} selected</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setRowSelection({})} className="h-8 px-2 text-muted-foreground hover:bg-muted">
                                    <X className="h-3 w-3 md:mr-1" /> <span className="hidden md:inline">Clear</span>
                                </Button>

                                {allSelectedActive && (
                                    <Button size="sm" onClick={handleBulkClose} className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm border-green-600">
                                        <CheckCircle2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Close Sessions</span>
                                    </Button>
                                )}

                                {allSelectedCompleted && (
                                    <>
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => setShowBulkAdjust(true)}>
                                            <Pencil className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Adjust Time</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                            onClick={() => setShowBulkInvalidate(true)}
                                        >
                                            <Ban className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Invalidate</span>
                                        </Button>
                                    </>
                                )}

                                {allSelectedInvalid && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                        onClick={handleBulkRevalidate}
                                    >
                                        <RefreshCcw className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Revalidate</span>
                                    </Button>
                                )}

                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleBulkDelete}
                                    className="shadow-sm h-8"
                                >
                                    <Trash2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Delete</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BulkInvalidateDialog
                ids={getSelectedIds()}
                open={showBulkInvalidate}
                onOpenChange={setShowBulkInvalidate}
                onSuccess={refreshHistory}
            />

            <BulkAdjustTimeDialog
                ids={getSelectedIds()}
                open={showBulkAdjust}
                onOpenChange={setShowBulkAdjust}
                onSuccess={refreshHistory}
            />

            {adjustStudent && (
                <AdjustmentDialog
                    accountId={adjustStudent.account_id}
                    studentName={adjustStudent.name}
                    open={!!adjustStudent}
                    onOpenChange={(open) => !open && setAdjustStudent(null)}
                    onSuccess={() => {
                        // Refresh performance data after adjustment
                        setFilters({ ...filters });
                    }}
                />
            )}
        </div>
    );
}

