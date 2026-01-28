import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
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

interface PostCreateJobDialogProps {
    account: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: User) => void;
}

export function PostCreateJobDialog({ account, open, onOpenChange, onSuccess }: PostCreateJobDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');

    // Fetch jobs on open
    useEffect(() => {
        if (open) {
            fetchJobs();
            setSelectedJobId('');
        }
    }, [open]);

    const fetchJobs = async () => {
        try {
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

            // Refresh account data
            const updatedAccount = await accountService.get(account.id);
            onSuccess(updatedAccount);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to assign job');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDontAssign = () => {
        onOpenChange(false);
    };

    if (!account) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Job Assignment</DialogTitle>
                    <DialogDescription>
                        Would you like to assign <strong>{account.first_name} {account.last_name}</strong> to a job now?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Select Job</Label>
                        <Select onValueChange={setSelectedJobId} value={selectedJobId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a job..." />
                            </SelectTrigger>
                            <SelectContent className='w-full'>
                                <SelectItem value="none">None</SelectItem>
                                {jobs.map((job) => (
                                    <SelectItem key={job.id} value={job.id.toString()}>
                                        {job.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                <DialogFooter className="sm:justify-between">
                    {
                        !selectedJobId || selectedJobId === 'none' || isLoading ? (
                            <Button
                                variant="default"
                                className='w-full'
                                onClick={handleDontAssign}
                                disabled={isLoading}
                            >
                                Don't Assign for Now
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                className='w-full'
                                onClick={handleAssign}
                                disabled={!selectedJobId || isLoading}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Assign to Job
                            </Button>
                        )
                    }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
