/**
 * EditProfileDialog Component
 * 
 * Dialog for editing user profile information.
 * - Admin/Manager: Full access to edit name, email, school_id, course, year, semester, department
 * - Students: Can only edit gender and birth_date (profile picture is handled separately)
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { accountService } from '@/services/accountService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getDepartments } from '@/utils/departments';

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

// Course options (can be expanded or fetched from backend)
const COURSES = ['BSIT', 'BSCS', 'BSIS', 'BSEMC', 'ACT'];
const YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

type FormData = Partial<User>;

export function EditProfileDialog({ open, onOpenChange, onSuccess }: EditProfileDialogProps) {
    const { user, setUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const departments = getDepartments();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
    } = useForm<FormData>();

    const isStudent = user?.role === 'student';

    // Fetch current profile when dialog opens
    useEffect(() => {
        if (open) {
            fetchProfile();
        }
    }, [open]);

    const fetchProfile = async () => {
        setIsFetching(true);
        try {
            const profile = await accountService.getProfile();
            // Parse year_level into separate year and semester
            let year = 1;
            let semester = 1;
            if (profile.year_level) {
                year = Math.floor(profile.year_level);
                semester = Math.round((profile.year_level % 1) * 10);
            }

            reset({
                first_name: profile.first_name || '',
                middle_name: profile.middle_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                school_id: profile.school_id || '',
                department: profile.department || '',
                course: profile.course || '',
                gender: profile.gender || '',
                birth_date: profile.birth_date || '',
            });
            setValue('year_level', year + (semester / 10));
        } catch {
            toast.error('Failed to load profile');
        } finally {
            setIsFetching(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Helper to sanitize empty strings to undefined
            const sanitize = <T,>(value: T | string | null | undefined): T | undefined => {
                if (value === '' || value === null) return undefined;
                return value as T;
            };

            // For students, only send allowed fields
            let updateData: Partial<User>;
            if (isStudent) {
                updateData = {
                    gender: sanitize(data.gender),
                    birth_date: sanitize(data.birth_date),
                };
            } else {
                updateData = {
                    first_name: sanitize(data.first_name),
                    middle_name: sanitize(data.middle_name),
                    last_name: sanitize(data.last_name),
                    email: sanitize(data.email),
                    school_id: sanitize(data.school_id),
                    department: sanitize(data.department),
                    course: sanitize(data.course),
                    year_level: data.year_level, // year_level is managed by Select/setValue as number
                    gender: sanitize(data.gender),
                    birth_date: sanitize(data.birth_date),
                };
            }

            const updatedProfile = await accountService.updateProfile(updateData);
            setUser(updatedProfile);
            toast.success('Profile updated successfully');
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const watchYear = watch('year_level');
    const currentYear = watchYear ? Math.floor(Number(watchYear)) : 1;
    const currentSemester = watchYear ? Math.round((Number(watchYear) % 1) * 10) : 1;

    const handleYearChange = (year: string) => {
        setValue('year_level', Number(year) + (currentSemester / 10));
    };

    const handleSemesterChange = (semester: string) => {
        setValue('year_level', currentYear + (Number(semester) / 10));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        {isStudent
                            ? 'Update your personal information.'
                            : 'Update your profile information.'}
                    </DialogDescription>
                </DialogHeader>

                {isFetching ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Admin/Manager Fields */}
                        {!isStudent && (
                            <>
                                {/* Name Fields */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input
                                            id="first_name"
                                            {...register('first_name', { required: 'Required' })}
                                            placeholder="First"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="middle_name">Middle</Label>
                                        <Input
                                            id="middle_name"
                                            {...register('middle_name')}
                                            placeholder="Middle"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            {...register('last_name', { required: 'Required' })}
                                            placeholder="Last"
                                        />
                                    </div>
                                </div>

                                {/* Email & School ID */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...register('email', { required: 'Required' })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="school_id">School ID</Label>
                                        <Input
                                            id="school_id"
                                            {...register('school_id')}
                                            placeholder="e.g., 12-34567"
                                        />
                                    </div>
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select
                                        value={watch('department') || ''}
                                        onValueChange={(value) => setValue('department', value)}
                                    >
                                        <SelectTrigger className='w-full'>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Course & Year Level */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-2">
                                        <Label>Course</Label>
                                        <Select
                                            value={watch('course') || ''}
                                            onValueChange={(value) => setValue('course', value)}
                                        >
                                            <SelectTrigger className='w-full'>
                                                <SelectValue placeholder="Course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COURSES.map((course) => (
                                                    <SelectItem key={course} value={course}>
                                                        {course}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <Select
                                            value={String(currentYear)}
                                            onValueChange={handleYearChange}
                                        >
                                            <SelectTrigger className='w-full'>
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map((year) => (
                                                    <SelectItem key={year} value={String(year)}>
                                                        Year {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Semester</Label>
                                        <Select
                                            value={String(currentSemester)}
                                            onValueChange={handleSemesterChange}
                                        >
                                            <SelectTrigger className='w-full'>
                                                <SelectValue placeholder="Sem" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SEMESTERS.map((sem) => (
                                                    <SelectItem key={sem} value={String(sem)}>
                                                        Semester {sem}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Common Fields for All Roles */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Select
                                    value={watch('gender') || ''}
                                    onValueChange={(value) => setValue('gender', value)}
                                >
                                    <SelectTrigger className='w-full'>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GENDERS.map((gender) => (
                                            <SelectItem key={gender} value={gender}>
                                                {gender}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">Birth Date</Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    {...register('birth_date')}
                                />
                            </div>
                        </div>

                        {/* Student Note */}
                        {isStudent && (
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                NOTE: To update other profile information, please contact your manager/administrator.
                            </p>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default EditProfileDialog;
