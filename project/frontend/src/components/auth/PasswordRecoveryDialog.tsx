import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from '@/services/authService';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"

interface PasswordRecoveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PasswordRecoveryDialog({ open, onOpenChange }: PasswordRecoveryDialogProps) {
    const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await authService.requestRecovery(email);
            setStep('otp');
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to send recovery email.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            await authService.verifyRecovery(email, otp, newPassword);
            setStep('success');
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to reset password.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after a short delay/animation
        setTimeout(() => {
            setStep('email');
            setEmail('');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setError(null);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {step === 'success' ? '' : 'Account Recovery'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {step === 'email' && 'Enter the email linked to your account'}
                        {step === 'otp' && 'Enter the OTP sent on your email, and your new password'}
                        {step === 'success' && ''}
                    </DialogDescription>
                </DialogHeader>

                <div>
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'email' && (
                        <form onSubmit={handleRequestOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    id="recovery-email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                                    {isLoading ? 'Sending...' : 'Send Recovery Code'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-center">
                                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} disabled={isLoading} required>
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} />
                                            <InputOTPSlot index={1} />
                                            <InputOTPSlot index={2} />
                                            <InputOTPSlot index={3} />
                                            <InputOTPSlot index={4} />
                                            <InputOTPSlot index={5} />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>

                                <Label htmlFor="recovery-otp" className="text-slate-300 hidden">Recovery Code</Label>
                                <Input
                                    id="recovery-otp"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="hidden bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-center text-lg tracking-widest"
                                    disabled={isLoading}
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-slate-300">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="h-12 w-12 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center text-2xl border border-green-800">
                                    ✓
                                </div>
                            </div>
                            <p className="text-slate-300">
                                Your password has been reset successfully.<br />
                                Please login with your new password.
                            </p>
                            <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700">
                                Return to Login
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
