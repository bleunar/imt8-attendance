
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { attendanceService } from '@/services/attendanceService';
import type { ActivityRecord } from '@/types';

const formSchema = z.object({
    invalidation_notes: z.string().min(1, 'Reason is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface InvalidationDetailsDialogProps {
    activity: ActivityRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function InvalidationDetailsDialog({ activity, open, onOpenChange, onSuccess }: InvalidationDetailsDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            invalidation_notes: '',
        },
    });

    const initializedId = useRef<number | null>(null);

    useEffect(() => {
        if (open && activity) {
            // Only reset if we haven't initialized for this ID yet (first open)
            if (initializedId.current !== activity.id) {
                form.reset({
                    invalidation_notes: activity.invalidation_notes || '',
                });
                setIsEditing(false);
                initializedId.current = activity.id;
            }
        } else if (!open) {
            // Reset tracker when closed
            initializedId.current = null;
        }
    }, [activity, open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!activity) return;

        setIsLoading(true);
        try {
            await attendanceService.update(activity.id, {
                invalidation_notes: values.invalidation_notes
            });
            toast.success('Invalidation reason updated');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to update reason');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invalidation Details</DialogTitle>
                    <DialogDescription>
                        View or edit the reason for this activity's invalidation.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="invalidation_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            // readOnly={!isEditing}
                                            className={!isEditing ? "bg-muted" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            {isEditing ? (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                        Close
                                    </Button>
                                    <Button type="button" onClick={() => setIsEditing(true)}>
                                        Edit Reason
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
