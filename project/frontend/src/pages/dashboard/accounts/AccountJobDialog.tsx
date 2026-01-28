import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { jobService } from '@/services/jobService';
import { accountService } from '@/services/accountService';
import type { User, Job } from '@/types';
import { Loader2 } from 'lucide-react';

interface AccountJobDialogProps {
    account: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: User) => void;
}

export function AccountJobDialog({ account, open, onOpenChange, onSuccess }: AccountJobDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');

    // Fetch jobs on open
    useEffect(() => {
        if (open) {
            fetchJobs();
            // Reset state
            setSelectedJobId('');
        }
    }, [open]);

    const fetchJobs = async () => {
        try {
            // Get all jobs (using large page size or separate all endpoint if implementation details differ)
            // Assuming list handles basic filtering
            const response = await jobService.list({ page_size: 100 });
            setJobs(response.items);
        } catch (error) {
            toast.error('Failed to load jobs');
        }
    };

    const handleAssign = async () => {
        if (!account || !selectedJobId) return;
        setIsLoading(true);
        try {
            await jobService.assign(Number(selectedJobId), account.id);
            toast.success('Job assigned successfully');

            // Refresh account data to get updated job info
            const updatedAccount = await accountService.get(account.id);
            onSuccess(updatedAccount);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to assign job');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnassign = async () => {
        if (!account || !account.current_job) return;

        // We need the job ID to unassign. 
        // The current_job is just a string name here. 
        // This is a limitation of the current quick implementation.
        // We need to fetch the assignments to find the ID, or update backend to return ID.
        // For now, let's fetch assignments first.

        if (!confirm(`Are you sure you want to unassign ${account.current_job}?`)) return;

        setIsLoading(true);
        try {
            // NOTE: Ideally the backend AccountResponse should have current_job_id too.
            // Workaround: We loop through jobs to match name or fetch assignments.
            // Fetching assignments is reliable.
            // HOWEVER: We don't have an endpoint "get current job assignment for account".
            // We have "list assignments for job".
            // Let's assume the user selects the job to unassign? No, that's tedious.
            // Backend fix: return current_job_id in AccountResponse.

            // Wait, I can just cheat and try to find the job by name from the list I have.
            const job = jobs.find(j => j.name === account.current_job);
            if (!job) {
                toast.error('Could not identify job ID. Please manage from Job page.');
                return;
            }

            await jobService.unassign(job.id, account.id);
            toast.success('Job unassigned successfully');

            // Refresh account data
            const updatedAccount = await accountService.get(account.id);
            onSuccess(updatedAccount);
            onOpenChange(false);

        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to unassign job');
        } finally {
            setIsLoading(false);
        }
    };


    if (!account) return null;

    const hasJob = !!account.current_job;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Manage Job Assignment</DialogTitle>
                    <DialogDescription>
                        Assign or remove job for {account.first_name} {account.last_name}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 pb-0 space-y-4">
                    {hasJob ? (
                        <div className="rounded-lg">
                            <div className="border p-4 rounded">
                                <div className="text-sm text-slate-400 mb-1 text-center">Current Job</div>
                                <div className="font-semibold text-md text-center gap-2">
                                    {account.current_job}
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleUnassign}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unassign'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Available Jobs</Label>
                                <Select onValueChange={setSelectedJobId} value={selectedJobId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a job..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobs.map((job) => (
                                            <SelectItem key={job.id} value={job.id.toString()}>
                                                {job.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleAssign}
                                disabled={!selectedJobId || isLoading}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Job'}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
