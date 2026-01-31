/**
 * Dialog for adding/deducting time for a student.
 */

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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { timeAdjustmentService } from '@/services/timeAdjustmentService';

interface AdjustmentDialogProps {
    accountId: number;
    studentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AdjustmentDialog({ accountId, studentName, open, onOpenChange, onSuccess }: AdjustmentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState<'hours' | 'minutes'>('hours');
    const [operation, setOperation] = useState<'add' | 'deduct'>('add');
    const [reason, setReason] = useState('');

    const resetForm = () => {
        setAmount('');
        setUnit('hours');
        setOperation('add');
        setReason('');
    };

    const onSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!reason.trim()) {
            toast.error('Please provide a reason for this adjustment');
            return;
        }

        setIsLoading(true);
        try {
            let minutes = parseFloat(amount);
            if (unit === 'hours') {
                minutes = minutes * 60;
            }

            // Apply operation
            if (operation === 'deduct') {
                minutes = -minutes;
            }

            await timeAdjustmentService.create({
                account_id: accountId,
                adjustment_minutes: Math.round(minutes),
                reason: reason.trim()
            });

            const action = operation === 'add' ? 'added to' : 'deducted from';
            toast.success(`Time ${action} ${studentName}`);
            resetForm();
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to create adjustment');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Adjust Time</DialogTitle>
                    <DialogDescription>
                        Add or deduct time for <strong>{studentName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Operation Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant={operation === 'add' ? 'default' : 'outline'}
                            onClick={() => setOperation('add')}
                            className={operation === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            Add Time
                        </Button>
                        <Button
                            type="button"
                            variant={operation === 'deduct' ? 'default' : 'outline'}
                            onClick={() => setOperation('deduct')}
                            className={operation === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            Deduct Time
                        </Button>
                    </div>

                    <hr></hr>

                    {/* Amount and Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder=""
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className='opacity-0'>Hello World</Label>
                            <Select value={unit} onValueChange={(v: 'hours' | 'minutes') => setUnit(v)}>
                                <SelectTrigger className='w-full border-0 shadow-none'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Hour/s</SelectItem>
                                    <SelectItem value="minutes">Minute/s</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Reason <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="Description and Reason for the adjsutment"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isLoading}
                        className={operation === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    >
                        {isLoading ? 'Saving...' : `${operation === 'add' ? 'Add' : 'Deduct'} Time`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
