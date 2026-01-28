import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { accountService } from '@/services/accountService';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountUpdate, User } from '@/types';
import { getDepartments } from '@/utils/departments';

interface EditAccountDialogProps {
    account: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: User) => void;
}

export function EditAccountDialog({ account, open, onOpenChange, onSuccess }: EditAccountDialogProps) {
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AccountUpdate>();

    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');

    const updateYearLevel = (year: string, sem: string) => {
        if (year && sem) {
            const floatVal = parseFloat(`${year}.${sem}`);
            setValue('year_level', floatVal);
        }
    };

    useEffect(() => {
        if (account && open) {
            reset({
                role: account.role,
                department: account.department || '',
                school_id: account.school_id || '',
                email: account.email,
                first_name: account.first_name || '',
                middle_name: account.middle_name || '',
                last_name: account.last_name || '',
                gender: account.gender || 'Male',
                course: account.course || '',
                year_level: account.year_level || undefined,
            });
            if (account.year_level) {
                const year = Math.floor(account.year_level).toString();
                const sem = Math.round((account.year_level % 1) * 10).toString();
                setSelectedYear(year);
                setSelectedSem(sem);
            } else {
                setSelectedYear('');
                setSelectedSem('');
            }
        }
    }, [account, open, reset]);


    const selectedRole = watch('role');
    const selectedDepartment = watch('department');

    const onSubmit = async (data: AccountUpdate) => {
        if (!account) return;
        setIsLoading(true);
        try {
            const updatedAccount = await accountService.update(account.id, data);
            toast.success('Account updated successfully');
            onSuccess(updatedAccount);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update account');
        } finally {
            setIsLoading(false);
        }
    };

    const isAdmin = currentUser?.role === 'admin';
    // Managers can only edit students, but the parent component should enforce visibility.
    // However, if a manager tries to change role, backend blocks it. UI should also disable it.

    if (!account) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogDescription>
                        Update details for {account.first_name} {account.last_name}
                    </DialogDescription>
                </DialogHeader>



                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-first_name">First Name *</Label>
                        <Input id="edit-first_name" {...register('first_name', { required: true })} />
                        {errors.first_name && <span className="text-xs text-red-500">Required</span>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-middle_name">Middle Name</Label>
                        <Input id="edit-middle_name" {...register('middle_name')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-last_name">Last Name *</Label>
                        <Input id="edit-last_name" {...register('last_name', { required: true })} />
                        {errors.last_name && <span className="text-xs text-red-500">Required</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-school_id">School ID {selectedRole === 'student' && '*'}</Label>
                    <Input
                        id="edit-school_id"
                        {...register('school_id', { required: selectedRole === 'student' })}
                        placeholder="Required for students"
                    />
                    {errors.school_id && <span className="text-xs text-red-500">School ID is required for students</span>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input id="edit-email" type="email" {...register('email', { required: true })} />
                    {errors.email && <span className="text-xs text-red-500">Required</span>}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 pb-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select
                                disabled={!isAdmin}
                                onValueChange={(value) => setValue('role', value as any)}
                                value={selectedRole}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRole !== 'student' && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-department">Department {selectedRole === 'manager' && '*'}</Label>
                                <Select
                                    onValueChange={(value) => setValue('department', value)}
                                    value={selectedDepartment}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getDepartments().map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" {...register('department', { required: selectedRole === 'manager' })} />
                                {errors.department && <span className="text-xs text-red-500">Department is required for managers</span>}
                            </div>
                        )}
                    </div>

                    {selectedRole === 'student' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-course">Course</Label>
                                <Input id="edit-course" {...register('course')} placeholder="e.g. BSIT" />
                            </div>
                            <div className="space-y-2">
                                <Label>Year & Semester</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedYear}
                                        onValueChange={(val) => {
                                            setSelectedYear(val);
                                            updateYearLevel(val, selectedSem);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6].map((year) => (
                                                <SelectItem key={year} value={year.toString()}>
                                                    Year {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={selectedSem}
                                        onValueChange={(val) => {
                                            setSelectedSem(val);
                                            updateYearLevel(selectedYear, val);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Semester" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1st Sem</SelectItem>
                                            <SelectItem value="2">2nd Sem</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <input type="hidden" {...register('year_level', { required: selectedRole === 'student', valueAsNumber: true })} />
                                {errors.year_level && <span className="text-xs text-red-500">Year and Semester are required</span>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-gender">Gender</Label>
                            <Select
                                onValueChange={(value) => setValue('gender', value)}
                                defaultValue={account.gender || 'Male'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
