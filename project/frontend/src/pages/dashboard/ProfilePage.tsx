import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { accountService } from '@/services/accountService';
import type { User } from '@/types';
import { toast } from 'sonner';
import { Key, Save, Loader2 } from 'lucide-react';

import { SelfChangePasswordDialog } from './accounts/SelfChangePasswordDialog';
import { getDepartments } from '@/utils/departments';

export default function ProfilePage() {
    const { user: authUser, setUser } = useAuth(); // Auth context user
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');

    const updateYearLevel = (year: string, sem: string) => {
        if (year && sem) {
            const floatVal = parseFloat(`${year}.${sem}`);
            setValue('year_level', floatVal);
        }
    };

    const { register, handleSubmit, reset, setValue } = useForm<User>();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setIsLoading(true);
        try {
            const data = await accountService.getProfile();
            setProfile(data);

            // Populate form
            reset({
                first_name: data.first_name,
                middle_name: data.middle_name || '',
                last_name: data.last_name,
                birth_date: data.birth_date,
                gender: data.gender,
                department: data.department || '',
                course: data.course || '',
                year_level: data.year_level || undefined,
            });

            if (data.year_level) {
                const year = Math.floor(data.year_level).toString();
                const sem = Math.round((data.year_level % 1) * 10).toString();
                setSelectedYear(year);
                setSelectedSem(sem);
            }

            // Sync with auth context if different (optional but good practice)
            if (authUser && authUser.id === data.id) {
                // Update context only if strictly necessary, but maybe safer to rely on backend
            }

        } catch (error) {
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: Partial<User>) => {
        setIsLoading(true); // Lock UI while saving
        setIsSaving(true);
        try {
            const updatedProfile = await accountService.updateProfile({
                first_name: data.first_name,
                middle_name: data.middle_name,
                last_name: data.last_name,
                birth_date: data.birth_date,
                gender: data.gender,
                department: data.department,
                course: data.course,
                year_level: data.year_level,
            });

            setProfile(updatedProfile);
            // Update global auth user state to reflect name changes immediately
            if (authUser) {
                setUser({ ...authUser, ...updatedProfile });
            }
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setIsSaving(false);
            setIsLoading(false);
        }
    };

    if (isLoading && !profile) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
                <p className="text-muted-foreground">Manage your personal information and security settings.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Information */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your personal details.</CardDescription>
                            </div>
                            <Button type="submit" form="profile-form" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-0 h-4 w-4" />Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input id="first_name" {...register('first_name', { required: true })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input id="middle_name" {...register('middle_name')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input id="last_name" {...register('last_name', { required: true })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="birth_date">Date of Birth</Label>
                                    <Input
                                        id="birth_date"
                                        type="date"
                                        {...register('birth_date')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select
                                        defaultValue={profile.gender || undefined}
                                        onValueChange={(val) => setValue('gender', val)}
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

                            <Separator />

                            {/* Role Specific Fields */}
                            {profile.role !== 'student' ? (
                                /* Admin / Manager View */
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select
                                        defaultValue={profile.department || undefined}
                                        onValueChange={(val) => setValue('department', val)}
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
                                </div>
                            ) : (
                                /* Student View */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="course">Course</Label>
                                        <Input id="course" {...register('course')} placeholder="e.g. BSIT" />
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
                                        <input type="hidden" {...register('year_level', { valueAsNumber: true })} />
                                    </div>
                                </div>
                            )}

                        </form>
                    </CardContent>
                </Card>

                {/* Account Details (Read Only) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>System managed information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email Address</Label>
                            <div className="font-medium flex items-center gap-2">
                                {profile.email}
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">School ID</Label>
                            <div className="font-mono">{profile.school_id || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Role</Label>
                                <div>
                                    <Badge variant="outline" className="capitalize">{profile.role}</Badge>
                                </div>
                            </div>
                            {profile.role === 'student' && (
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Department</Label>
                                    <div className="font-medium">{profile.department || 'None'}</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Manage your password and security.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="font-medium">Password</div>
                                <div className="text-sm text-muted-foreground">Last updated recently</div>
                            </div>
                            <Button variant="outline" onClick={() => setIsPasswordOpen(true)}>
                                <Key className="mr-2 h-4 w-4" /> Change Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SelfChangePasswordDialog
                open={isPasswordOpen}
                onOpenChange={setIsPasswordOpen}
            />
        </div >
    );
}
