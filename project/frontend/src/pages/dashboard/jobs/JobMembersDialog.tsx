
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { jobService } from '@/services/jobService';
import { accountService } from '@/services/accountService';
import type { Job, AccountJob, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getDepartments } from '@/utils/departments';

interface JobMembersDialogProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JobMembersDialog({ job, open, onOpenChange }: JobMembersDialogProps) {
    const { user: currentUser } = useAuth();
    const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    // Data
    const [assignments, setAssignments] = useState<AccountJob[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    // Filters & Loading
    const [isLoadingLeft, setIsLoadingLeft] = useState(false);
    const [isLoadingRight, setIsLoadingRight] = useState(false);
    const [searchLeft, setSearchLeft] = useState('');
    const [searchRight, setSearchRight] = useState('');
    const [filterDept, setFilterDept] = useState<string>('all');
    const [filterDeptRight, setFilterDeptRight] = useState<string>('all');
    const departments = getDepartments();

    // Selection
    // We store IDs of checked items
    const [checkedLeft, setCheckedLeft] = useState<Set<number>>(new Set());
    const [checkedRight, setCheckedRight] = useState<Set<number>>(new Set());

    // Fetch Assigned (Right Side)
    const fetchAssignments = async () => {
        if (!job) return;
        setIsLoadingRight(true);
        try {
            const data = await jobService.listAssignments(job.id);
            setAssignments(data);
            // Clear right selection on refresh
            setCheckedRight(new Set());
        } catch (error) {
            toast.error('Failed to load assigned members');
        } finally {
            setIsLoadingRight(false);
        }
    };

    // Fetch Available (Left Side)
    const fetchAvailable = async () => {
        setIsLoadingLeft(true);
        try {
            // Fetch students AND managers
            const response = await accountService.list({
                role: 'student,manager',
                department: filterDept === 'all' ? undefined : filterDept,
                search: searchLeft,
                page_size: 100 // Limit for now, ideally virtualized or paginated if huge
            });

            // Filter out those already assigned TO THIS JOB (or potentially any job if backend enforcing 1 job)
            // Backend enforces 1 job per student. Ideally we should filter out anyone with a 'current_job'
            // But let's verify if response includes current_job. Yes `User` type has `current_job`.
            setAvailableUsers(response.items.filter(u => !u.current_job));

            // Clear left selection
            setCheckedLeft(new Set());
        } catch (error) {
            toast.error('Failed to search students');
        } finally {
            setIsLoadingLeft(false);
        }
    };

    // Initial Load
    useEffect(() => {
        if (open && job) {
            fetchAssignments();
            fetchAvailable();
        }
    }, [open, job]);

    // Trigger available fetch on filter change (debounced search handled manually or simple effect)
    useEffect(() => {
        if (open && job) {
            // Debounce search could be added here, currently instant on effect triggers
            const timer = setTimeout(() => fetchAvailable(), 300);
            return () => clearTimeout(timer);
        }
    }, [searchLeft, filterDept]);


    // Handlers
    const handleCheckLeft = (id: number, checked: boolean) => {
        const newSet = new Set(checkedLeft);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setCheckedLeft(newSet);
    };

    const handleCheckRight = (id: number, checked: boolean) => {
        const newSet = new Set(checkedRight);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setCheckedRight(newSet);
    };

    const handleCheckAllLeft = (checked: boolean) => {
        if (checked) {
            setCheckedLeft(new Set(availableUsers.map(u => u.id)));
        } else {
            setCheckedLeft(new Set());
        }
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesName = (a.account_name || '').toLowerCase().includes(searchRight.toLowerCase());
        const matchesDept = filterDeptRight === 'all' || a.department === filterDeptRight;
        return matchesName && matchesDept;
    });

    const handleCheckAllRight = (checked: boolean) => {
        const newSet = new Set(checkedRight);
        if (checked) {
            // Add all filtered to selection
            filteredAssignments.forEach(a => newSet.add(a.account_id));
        } else {
            // Remove all filtered from selection
            filteredAssignments.forEach(a => newSet.delete(a.account_id));
        }
        setCheckedRight(newSet);
    };

    // Bulk Actions
    const handleMoveRight = async () => {
        // Assign selected available users
        if (!job || checkedLeft.size === 0) return;
        setIsLoadingRight(true); // Lock right side behavior visually
        try {
            const idsToAssign = Array.from(checkedLeft);
            const res = await jobService.assignBulk(job.id, idsToAssign);
            toast.success(res.message);

            // Refresh both lists
            fetchAssignments();
            fetchAvailable();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to assign assignments');
        } finally {
            setIsLoadingRight(false);
        }
    };

    const handleMoveLeft = async () => {
        // Unassign selected assigned users
        if (!job || checkedRight.size === 0) return;
        if (!confirm(`Remove ${checkedRight.size} members from this job?`)) return;

        setIsLoadingRight(true);
        try {
            const idsToUnassign = Array.from(checkedRight);
            const res = await jobService.unassignBulk(job.id, idsToUnassign);
            toast.success(res.message);

            // Refresh both lists
            fetchAssignments();
            fetchAvailable();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to remove members');
        } finally {
            setIsLoadingRight(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] max-w-[90vw] h-[85vh] flex flex-col p-6 sm:max-w-[90vw]">
                <DialogHeader className="mb-2">
                    <DialogTitle>Manage Members: {job.name}</DialogTitle>
                    <DialogDescription>
                        Assign students to this job position. Students can only have one job assignment at a time.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* LEFT PANEL: Available Students */}
                    <div className="flex-1 border rounded-lg flex flex-col bg-slate-50/50">
                        <div className="p-3 border-b space-y-3 bg-white rounded-t-lg">
                            <h3 className="font-semibold text-sm flex items-center justify-between">
                                Available to Assign
                                <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{availableUsers.length}</span>
                            </h3>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        className="pl-8 h-9"
                                        value={searchLeft}
                                        onChange={(e) => setSearchLeft(e.target.value)}
                                    />
                                </div>
                                <Select value={filterDept} onValueChange={setFilterDept}>
                                    <SelectTrigger className="w-[130px] h-9">
                                        <SelectValue placeholder="Dept" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Depts</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {isLoadingLeft ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : availableUsers.length === 0 ? (
                                <div className="text-center text-sm text-slate-400 p-8">No available students found.</div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded text-sm font-medium border-b mb-1">
                                        <Checkbox
                                            checked={checkedLeft.size === availableUsers.length && availableUsers.length > 0}
                                            onCheckedChange={(c) => handleCheckAllLeft(!!c)}
                                        />
                                        <span className="text-muted-foreground">Select All</span>
                                    </div>
                                    {availableUsers.map(user => (
                                        <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-colors group">
                                            <Checkbox
                                                checked={checkedLeft.has(user.id)}
                                                onCheckedChange={(c) => handleCheckLeft(user.id, !!c)}
                                            />
                                            <div className="flex-1 text-sm">
                                                <div className="font-medium text-slate-800">{user.first_name} {user.last_name}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{user.school_id || 'No ID'}</span>
                                                    <span>•</span>
                                                    <span>{user.department || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* MIDDLE: Actions */}
                    <div className="flex flex-col justify-center gap-3">
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            disabled={checkedLeft.size === 0 || !canManage}
                            onClick={handleMoveRight}
                            title="Assign Selected"
                        >
                            <span className="hidden sm:inline">Assign</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            disabled={checkedRight.size === 0 || !canManage}
                            onClick={handleMoveLeft}
                            title="Unassign Selected"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Remove</span>
                        </Button>
                    </div>

                    {/* RIGHT PANEL: Assigned Members */}
                    <div className="flex-1 border rounded-lg flex flex-col bg-slate-50/50">
                        <div className="p-3 border-b space-y-3 bg-white rounded-t-lg">
                            <h3 className="font-semibold text-sm flex items-center justify-between">
                                Currently Assigned
                                <span className="text-xs text-muted-foreground bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{filteredAssignments.length}</span>
                            </h3>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search assigned..."
                                        className="pl-8 h-9"
                                        value={searchRight}
                                        onChange={(e) => setSearchRight(e.target.value)}
                                    />
                                </div>
                                <Select value={filterDeptRight} onValueChange={setFilterDeptRight}>
                                    <SelectTrigger className="w-[130px] h-9">
                                        <SelectValue placeholder="Dept" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Depts</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {isLoadingRight ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : filteredAssignments.length === 0 ? (
                                <div className="text-center text-sm text-slate-400 p-8">No members found.</div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded text-sm font-medium border-b mb-1">
                                        <Checkbox
                                            checked={filteredAssignments.length > 0 && filteredAssignments.every(a => checkedRight.has(a.account_id))}
                                            onCheckedChange={(c) => handleCheckAllRight(!!c)}
                                        />
                                        <span className="text-muted-foreground">Select All</span>
                                    </div>
                                    {filteredAssignments.map(assign => (
                                        <div key={assign.account_id} className="flex items-center gap-3 p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-colors group">
                                            <Checkbox
                                                checked={checkedRight.has(assign.account_id)}
                                                onCheckedChange={(c) => handleCheckRight(assign.account_id, !!c)}
                                            />
                                            <div className="flex-1 text-sm">
                                                <div className="font-medium text-slate-800">{assign.account_name}</div>
                                                <div className="text-xs text-slate-500">
                                                    Since {new Date(assign.assigned_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
