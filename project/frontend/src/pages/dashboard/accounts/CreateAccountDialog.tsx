import { useState } from 'react';
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
import type { AccountCreate, User } from '@/types';
import { getDepartments } from '@/utils/departments';

interface CreateAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (account: User) => void;
}

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AccountCreate>({
        defaultValues: {
            role: currentUser?.role === 'manager' ? 'student' : 'student',
            department: '',
            school_id: '',
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            gender: 'Male',
        }
    });

    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');

    const updateYearLevel = (year: string, sem: string) => {
        if (year && sem) {
            const floatVal = parseFloat(`${year}.${sem}`);
            setValue('year_level', floatVal);
        }
    };

    const selectedRole = watch('role');

    const onSubmit = async (data: AccountCreate) => {
        setIsLoading(true);
        try {
            const newAccount = await accountService.create(data);
            toast.success('Account created successfully');
            reset();
            onSuccess(newAccount);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Account</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new user account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 pb-0">
                    <div className="text-xl font-semibold border-b pb-1 text-start">User Information</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input id="first_name" {...register('first_name', { required: true })} />
                            {errors.first_name && <span className="text-xs text-red-500">Required</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="middle_name">Middle Name</Label>
                            <Input id="middle_name" {...register('middle_name')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input id="last_name" {...register('last_name', { required: true })} />
                            {errors.last_name && <span className="text-xs text-red-500">Required</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="school_id">School ID {selectedRole === 'student' && '*'}</Label>
                            <Input
                                id="school_id"
                                {...register('school_id', { required: selectedRole === 'student' })}
                                placeholder="Required for students"
                            />
                            {errors.school_id && <span className="text-xs text-red-500">School ID is required for students</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" {...register('email', { required: true })} />
                            {errors.email && <span className="text-xs text-red-500">Required</span>}
                        </div>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input id="password" type="password" {...register('password', { required: true, minLength: 6 })} />
                        {errors.password && <span className="text-xs text-red-500">Required (min 6 chars)</span>}
                    </div>

                    <div className="text-xl font-semibold mt-8 border-b pb-1 text-start">Roles and Specialization</div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                disabled={!isAdmin}
                                onValueChange={(value) => setValue('role', value as any)}
                                defaultValue={isAdmin ? 'student' : 'student'}
                            >
                                <SelectTrigger className='w-full'>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    {isAdmin && <SelectItem value="manager">Manager</SelectItem>}
                                    {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select onValueChange={(value) => setValue('gender', value)}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRole !== 'student' && (
                            <div className="space-y-2">
                                <Label htmlFor="department">Department {selectedRole === 'manager' && '*'}</Label>
                                <Select onValueChange={(value) => setValue('department', value)}>
                                    <SelectTrigger className='w-full'>
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


                        <div className="space-y-2">
                            <Label htmlFor="course">
                                {selectedRole === 'student' ? 'Course' : 'Specialization'}
                            </Label>
                            <Input
                                id="course"
                                {...register('course')}
                                placeholder={selectedRole === 'student' ? "e.g. BSIT" : "e.g. IT Department Head"}
                            />
                        </div>


                        {selectedRole === 'student' && (
                            <div className="space-y-2">
                                <Label>Year & Semester</Label>
                                <div className="flex gap-2">
                                    <Select onValueChange={(val) => {
                                        setSelectedYear(val);
                                        updateYearLevel(val, selectedSem);
                                    }}>
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

                                    <Select onValueChange={(val) => {
                                        setSelectedSem(val);
                                        updateYearLevel(selectedYear, val);
                                    }}>
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
                        )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
