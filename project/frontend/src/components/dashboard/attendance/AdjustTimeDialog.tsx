
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { attendanceService } from '@/services/attendanceService';
import type { ActivityRecord } from '@/types';

const formSchema = z.object({
    date_in: z.string().optional(),
    time_in: z.string().optional(),
    date_out: z.string().optional(),
    time_out: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdjustTimeDialogProps {
    activity: ActivityRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AdjustTimeDialog({ activity, open, onOpenChange, onSuccess }: AdjustTimeDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date_in: '',
            time_in: '',
            date_out: '',
            time_out: '',
        },
    });

    useEffect(() => {
        if (activity && open) {
            // Format to HH:mm for time input
            const formatTime = (dateStr: string | null) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return format(date, "HH:mm");
            };

            // Format to YYYY-MM-DD for date input
            const formatDate = (dateStr: string | null) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return format(date, "yyyy-MM-dd");
            };

            form.reset({
                date_in: formatDate(activity.time_in),
                time_in: formatTime(activity.time_in),
                date_out: formatDate(activity.time_out),
                time_out: formatTime(activity.time_out),
            });
        }
    }, [activity, open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!activity) return;

        setIsLoading(true);
        try {
            const combineDateAndTime = (dateStr: string | undefined, timeStr: string | undefined) => {
                // If neither provided, return undefined
                if (!dateStr && !timeStr) return undefined;

                // If only one Provided? We need both to make a valid specific timestamp usually, 
                // OR we rely on the other existing.
                // But here we are editing. If I change Time, I must have a Date.
                // The form pre-fills Date. So Date should be there.

                if (!dateStr || !timeStr) return undefined; // Enforce both for simplicity/correctness

                const [year, month, day] = dateStr.split('-').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);

                const newDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

                // We use local date construction above (Browser Local Time) which is what inputs usually represent.
                // Then toISOString converts to UTC.
                return newDate.toISOString();
            };

            const newTimeIn = combineDateAndTime(values.date_in, values.time_in);

            let newTimeOut = undefined;
            if (values.time_out || values.date_out) {
                newTimeOut = combineDateAndTime(values.date_out, values.time_out);
            }

            const payload: { time_in?: string; time_out?: string } = {};

            if (values.time_in && values.date_in) {
                if (newTimeIn) payload.time_in = newTimeIn;
            }

            if (values.time_out && values.date_out) {
                if (newTimeOut) payload.time_out = newTimeOut;
            }

            await attendanceService.update(activity.id, payload);
            toast.success('Activity time updated');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to update activity');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Time</DialogTitle>
                    <DialogDescription>
                        Modify the time for {activity?.account_name} on {activity?.time_in ? new Date(activity.time_in).toLocaleDateString() : 'Unknown Date'}.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="date_in"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Date In</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="time_in"
                                render={({ field }) => (
                                    <FormItem className="w-32">
                                        <FormLabel>Time In</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>


                        <hr></hr>

                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="date_out"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Date Out</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="time_out"
                                render={({ field }) => (
                                    <FormItem className="w-32">
                                        <FormLabel>Time Out</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
