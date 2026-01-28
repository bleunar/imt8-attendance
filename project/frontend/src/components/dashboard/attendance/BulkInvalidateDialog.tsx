
import { useState } from 'react';
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

const formSchema = z.object({
    notes: z.string().min(1, 'Reason is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkInvalidateDialogProps {
    ids: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function BulkInvalidateDialog({ ids, open, onOpenChange, onSuccess }: BulkInvalidateDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            notes: '',
        },
    });

    const onSubmit = async (values: FormValues) => {
        if (!ids.length) return;

        setIsLoading(true);
        try {
            await attendanceService.bulkInvalidate(ids, values.notes);
            toast.success(`${ids.length} activities invalidated`);
            onSuccess();
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast.error('Failed to invalidate activities');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invalidate Selected Activities</DialogTitle>
                    <DialogDescription>
                        NOTE: Invalidated activities are excluded from performance calculations. Mark <b>{ids.length}</b> activities as invalid?
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Invalidation</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder=""
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={isLoading}>
                                {isLoading ? 'Invalidate All' : 'Invalidate All'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
