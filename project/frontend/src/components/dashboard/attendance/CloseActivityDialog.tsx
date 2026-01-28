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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from '@/components/ui/textarea';
import { attendanceService } from '@/services/attendanceService';
import type { ActivityRecord } from '@/types';

const formSchema = z.object({
    action: z.enum(['now', 'custom', 'invalidate']),
    time_out: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)").optional(),
    notes: z.string().optional(),
}).refine((data) => {
    if (data.action === 'custom' && !data.time_out) {
        return false;
    }
    return true;
}, {
    message: "Time out is required for custom action",
    path: ["time_out"],
}).refine((data) => {
    if (data.action === 'invalidate' && !data.notes) {
        return false;
    }
    return true;
}, {
    message: "Reason is required for invalidation",
    path: ["notes"],
});

type FormValues = z.infer<typeof formSchema>;

interface CloseActivityDialogProps {
    activity: ActivityRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CloseActivityDialog({ activity, open, onOpenChange, onSuccess }: CloseActivityDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            action: 'now',
            time_out: '',
            notes: '',
        },
    });

    useEffect(() => {
        if (activity && open) {
            // For closing, time_out starts empty usually. 
            // If re-opening dialog, maybe we want current time? 
            // Or empty so user picks? Let's default to current time formatted HH:mm
            form.reset({
                action: 'now',
                time_out: format(new Date(), "HH:mm"),
                notes: ''
            });
        }
    }, [activity, open, form]);

    const action = form.watch('action');

    const onSubmit = async (values: FormValues) => {
        if (!activity) return;

        setIsLoading(true);
        try {
            const combineDateAndTime = (originalDateStr: string | null | undefined, timeStr: string | undefined, referenceDateStr?: string | null) => {
                if (!timeStr) return undefined;

                // Use provided original date, or fallback to today
                const baseDate = originalDateStr ? new Date(originalDateStr) : new Date();
                const [hours, minutes] = timeStr.split(':').map(Number);

                const newDate = new Date(baseDate);
                newDate.setHours(hours);
                newDate.setMinutes(minutes);
                newDate.setSeconds(0);
                newDate.setMilliseconds(0);

                // Overnight logic: If new date is before the reference start time (time_in), add 1 day
                if (referenceDateStr) {
                    const refDate = new Date(referenceDateStr);
                    // We allow a small buffer just in case, but strict comparison is usually fine for these manual edits
                    if (newDate < refDate) {
                        newDate.setDate(newDate.getDate() + 1);
                    }
                }

                return newDate.toISOString();
            };

            if (values.action === 'now') {
                await attendanceService.update(activity.id, {
                    time_out: new Date().toISOString()
                });
                toast.success('Activity closed');
            } else if (values.action === 'custom') {
                if (values.time_out) {
                    // Pass time_in as reference to handle overnight crossover
                    const combinedDate = combineDateAndTime(activity.time_in, values.time_out, activity.time_in);
                    await attendanceService.update(activity.id, {
                        time_out: combinedDate
                    });
                    toast.success('Activity closed with custom time');
                }
            } else if (values.action === 'invalidate') {
                if (values.notes) {
                    // Close first (to stop timer) then invalidate
                    // Or just invalidate? 
                    // Best to close it so it's not "active" in lookups checking time_out
                    await attendanceService.update(activity.id, {
                        time_out: new Date().toISOString()
                    });
                    await attendanceService.invalidate(activity.id, values.notes);
                    toast.success('Activity closed and invalidated');
                }
            }

            onSuccess();
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast.error('Failed to close activity');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Close Activity</DialogTitle>
                    <DialogDescription>
                        Select how you want to close the active session for {activity?.account_name}.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="action"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Action</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="now" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Close with current time
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="custom" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Close with custom time
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="invalidate" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Close and invalidate
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {action === 'custom' && (
                            <FormField
                                control={form.control}
                                name="time_out"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Time Out</FormLabel>
                                        <DialogDescription className="text-xs mb-2">
                                            This will set the time for date: {activity?.time_in ? format(new Date(activity.time_in), 'MMM dd, yyyy') : 'Today'}
                                        </DialogDescription>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {action === 'invalidate' && (
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reason for Invalidation</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Reason..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Confirm'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
