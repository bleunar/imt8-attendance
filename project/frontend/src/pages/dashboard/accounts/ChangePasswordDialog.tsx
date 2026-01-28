import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accountService } from '@/services/accountService';
import type { User } from '@/types';

interface ChangePasswordDialogProps {
    account: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ account, open, onOpenChange }: ChangePasswordDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ password: string }>();

    const onSubmit = async (data: { password: string }) => {
        if (!account) return;
        setIsLoading(true);
        try {
            // NOTE: The current backend endpoints are:
            // 1. PUT /accounts/profile/password (Self update, requires current password)
            // 2. PUT /accounts/{id} (Admin update, can set password directly without current)
            // We should use PUT /accounts/{id} here.

            await accountService.update(account.id, { password: data.password });
            toast.success('Password updated successfully');
            reset();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!account) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for {account.first_name} {account.last_name}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            {...register('password', { required: true, minLength: 6 })}
                        />
                        {errors.password && <span className="text-xs text-red-500">Required (min 6 chars)</span>}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} variant="destructive">
                            {isLoading ? 'Updating...' : 'Set Password'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
