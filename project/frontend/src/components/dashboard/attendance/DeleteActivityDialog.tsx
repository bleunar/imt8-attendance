
import { useState } from 'react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { attendanceService } from '@/services/attendanceService';
import type { ActivityRecord } from '@/types';

interface DeleteActivityDialogProps {
    activity: ActivityRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DeleteActivityDialog({ activity, open, onOpenChange, onSuccess }: DeleteActivityDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!activity) return;

        setIsLoading(true);
        try {
            await attendanceService.delete(activity.id);
            toast.success('Activity deleted permanently');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to delete activity');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the activity record for
                        <span className="font-medium text-foreground"> {activity?.account_name} </span>
                        on
                        <span className="font-medium text-foreground"> {activity?.time_in ? new Date(activity.time_in).toLocaleDateString() : 'Unknown Date'}</span>.
                        The student's total hours will be recalculated.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Deleting...' : 'Delete Permanently'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
