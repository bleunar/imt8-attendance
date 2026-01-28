import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { jobService } from '@/services/jobService';
import type { Job, JobCreate } from '@/types';
import { getDepartments } from '@/utils/departments';

interface CreateJobDialogProps {
    job?: Job | null; // If provided, we are editing
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (job: Job) => void;
}

export function CreateJobDialog({ job, open, onOpenChange, onSuccess }: CreateJobDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<JobCreate>();

    const selectedDepartment = watch('department');

    useEffect(() => {
        if (open) {
            if (job) {
                reset({
                    name: job.name,
                    department: job.department || '',
                    description: job.description || '',
                });
            } else {
                reset({
                    name: '',
                    department: '',
                    description: '',
                });
            }
        }
    }, [job, open, reset]);

    const onSubmit = async (data: JobCreate) => {
        setIsLoading(true);
        try {
            let result: Job;
            if (job) {
                result = await jobService.update(job.id, data);
                toast.success('Job updated successfully');
            } else {
                result = await jobService.create(data);
                toast.success('Job created successfully');
            }
            onSuccess(result);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to save job');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{job ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                    <DialogDescription>
                        {job ? 'Update job details.' : 'Enter the details for the new job.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Job Title *</Label>
                        <Input id="title" {...register('name', { required: true })} />
                        {errors.name && <span className="text-xs text-red-500">Required</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select
                            onValueChange={(value) => setValue('department', value)}
                            value={selectedDepartment}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                                {getDepartments().map((dept) => (
                                    <SelectItem key={dept} value={dept}>
                                        {dept}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...register('description')}
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : (job ? 'Update Job' : 'Create Job')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
