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

interface SelfChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SelfChangePasswordDialog({ open, onOpenChange }: SelfChangePasswordDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    const newPassword = watch('new_password');

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            await accountService.updatePassword(data.current_password, data.new_password);
            toast.success('Password updated successfully');
            reset();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Enter your current password and a new password.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            {...register('current_password', { required: true })}
                        />
                        {errors.current_password && <span className="text-xs text-red-500">Required</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            {...register('new_password', { required: true, minLength: 6 })}
                        />
                        {errors.new_password && <span className="text-xs text-red-500">Required (min 6 chars)</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            {...register('confirm_password', {
                                required: true,
                                validate: (val: string) => val === newPassword || 'Passwords do not match'
                            })}
                        />
                        {errors.confirm_password && (
                            <span className="text-xs text-red-500">
                                {errors.confirm_password.message as string || 'Required'}
                            </span>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Change Password'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
