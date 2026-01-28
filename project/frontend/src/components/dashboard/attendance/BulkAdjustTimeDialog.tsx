
import { useState } from 'react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { attendanceService } from '@/services/attendanceService';

interface BulkAdjustTimeDialogProps {
    ids: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function BulkAdjustTimeDialog({ ids, open, onOpenChange, onSuccess }: BulkAdjustTimeDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [dateIn, setDateIn] = useState('');
    const [timeIn, setTimeIn] = useState('');
    const [dateOut, setDateOut] = useState('');
    const [timeOut, setTimeOut] = useState('');

    const constructISO = (date: string, time: string) => {
        if (!date || !time) return undefined;
        const [y, m, d] = date.split('-').map(Number);
        const [h, min] = time.split(':').map(Number);
        return new Date(y, m - 1, d, h, min).toISOString();
    };

    const onSubmit = async () => {
        if (!ids.length) return;

        setIsLoading(true);
        try {
            const inISO = constructISO(dateIn, timeIn);
            const outISO = constructISO(dateOut, timeOut);

            if (!inISO && !outISO) {
                toast.error('Please specify at least one date/time pair');
                setIsLoading(false);
                return;
            }

            await attendanceService.bulkAdjust(ids, inISO, outISO);
            toast.success(`${ids.length} records adjusted`);
            onSuccess();
            onOpenChange(false);

            // Reset form
            setDateIn('');
            setTimeIn('');
            setDateOut('');
            setTimeOut('');
        } catch (error) {
            toast.error('Failed to adjust records');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Adjust Time for {ids.length} Records</DialogTitle>
                    <DialogDescription>
                        Set a new Time In or Time Out timestamp for all selected records.
                        <br />
                        <span className="text-xs text-yellow-600 font-bold">Note: Both Date and Time are required to set a value. This overwrites existing timestamps.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date In</Label>
                            <Input
                                type="date"
                                value={dateIn}
                                onChange={(e) => setDateIn(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time In</Label>
                            <Input
                                type="time"
                                value={timeIn}
                                onChange={(e) => setTimeIn(e.target.value)}
                            />
                        </div>
                    </div>

                    <hr className="border-t border-border" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date Out</Label>
                            <Input
                                type="date"
                                value={dateOut}
                                onChange={(e) => setDateOut(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time Out</Label>
                            <Input
                                type="time"
                                value={timeOut}
                                onChange={(e) => setTimeOut(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
