/**
 * UserProfile Component
 * 
 * A unified component for displaying user profiles with two modes:
 * - preview: Read-only view for AccountsPage dialogs
 * - profile: Editable view for My Profile page
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfilePicture } from '@/components/ProfilePicture';
import { ProfilePictureDialog } from '@/components/ProfilePictureDialog';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { accountService } from '@/services/accountService';
import attendanceService from '@/services/attendanceService';
import performanceService from '@/services/performanceService';
import type { User, ActivityRecord, PerformanceStat } from '@/types';
import { toast } from 'sonner';
import { Loader2, Mail, GraduationCap, Building, Pencil, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SelfChangePasswordDialog } from '@/pages/dashboard/accounts/SelfChangePasswordDialog';

interface UserProfileProps {
    /** User data to display (for preview mode) */
    user?: User | null;
    /** 'preview' for read-only, 'profile' for editable */
    mode: 'preview' | 'profile';
    /** Callback when profile is updated (profile mode only) */
    onUpdate?: () => void;
}

export function UserProfile({ user: propUser, mode, onUpdate }: UserProfileProps) {
    useAuth(); // Hook for auth context reactivity
    const [profile, setProfile] = useState<User | null>(propUser || null);
    const [isLoading, setIsLoading] = useState(!propUser);
    const [isPictureDialogOpen, setIsPictureDialogOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Tab data
    const [stats, setStats] = useState<PerformanceStat | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([]);
    const [isTabLoading, setIsTabLoading] = useState(false);

    // In profile mode, fetch current user's profile
    useEffect(() => {
        if (mode === 'profile' && !propUser) {
            fetchProfile();
        } else if (propUser) {
            setProfile(propUser);
            setIsLoading(false);
        }
    }, [mode, propUser]);

    // Fetch tab data when user or tab changes
    useEffect(() => {
        if (profile) {
            fetchTabData(activeTab);
        }
    }, [profile, activeTab]);

    const fetchProfile = async () => {
        setIsLoading(true);
        try {
            const data = await accountService.getProfile();
            setProfile(data);
        } catch {
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTabData = async (tab: string) => {
        if (!profile) return;
        setIsTabLoading(true);

        try {
            if (tab === 'overview') {
                const response = await performanceService.getStats({ search: profile.school_id || profile.email });
                if (response.items.length > 0) {
                    setStats(response.items[0]);
                }
            } else if (tab === 'activity') {
                const response = await attendanceService.getStudentActivities(profile.id, 1, 10);
                setRecentActivity(response.items);
            }
        } catch (error) {
            console.error('Failed to fetch tab data:', error);
        } finally {
            setIsTabLoading(false);
        }
    };

    // Note: Exposed for future use when edit features are added
    const _refreshProfile = () => {
        fetchProfile();
        onUpdate?.();
    };
    void _refreshProfile;  // Mark as intentionally available

    // Format year level display
    const formatYearLevel = (yearLevel: number | null) => {
        if (!yearLevel) return null;
        const year = Math.floor(yearLevel);
        const sem = Math.round((yearLevel % 1) * 10);
        return `${year} Sem ${sem}`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) return null;

    const isStudent = profile.role === 'student';

    return (
        <div className="space-y-4">
            {/* Header Section */}
            <div className="flex flex-col items-center text-center space-y-4 my-4 mb-4">
                {/* Profile Picture */}
                <div
                    className={mode === 'profile' ? 'cursor-pointer group relative' : ''}
                    onClick={mode === 'profile' ? () => setIsPictureDialogOpen(true) : undefined}
                >
                    <ProfilePicture
                        src={profile.profile_picture}
                        firstName={profile.first_name}
                        lastName={profile.last_name}
                        size="xl"
                        className="scale-250 my-8 mt-16 mb-0"
                    />
                </div>

                <div className="mt-4 py-4 pt-12 bg-muted/50 rounded shadow border w-full">
                    {/* Name & Info */}
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold">
                            {profile.first_name} {profile.last_name}
                        </h2>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{profile.email}</span>
                        </div>
                        {isStudent ? (
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                <GraduationCap className="h-4 w-4" />
                                <span className="text-sm">
                                    {profile.course || 'No Course'} {formatYearLevel(profile.year_level) || ''}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                <Building className="h-4 w-4" />
                                <span className="text-sm capitalize">
                                    {profile.role} • {profile.department || 'No Department'}
                                    {profile.course && ` • ${profile.course}`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons (Profile Mode Only) */}
                    {mode === 'profile' && (
                        <div className="flex gap-2 pt-2 justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditProfileOpen(true)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    <DropdownMenuItem onClick={() => setIsPictureDialogOpen(true)}>
                                        Change Profile Picture
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                        Change Password
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}


                </div>
            </div>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="place-self-center md:place-self-end w-full md:w-auto">
                    <TabsTrigger value="overview" className="gap-2">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-2">
                        Recent Activity
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="gap-2">
                        Schedule
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="pt-6">
                        {isTabLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-lg bg-muted/50 border shadow">
                                    <div className="text-2xl font-bold">
                                        {stats.total_rendered_hours.toFixed(1)}h
                                    </div>
                                    <div className="text-xs text-muted-foreground">Total Hours</div>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50 border shadow">
                                    <div className="text-2xl font-bold">
                                        {stats.avg_daily_hours.toFixed(1)}h
                                    </div>
                                    <div className="text-xs text-muted-foreground">Daily Average</div>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50 border shadow">
                                    <div className="text-2xl font-bold">
                                        {stats.avg_weekly_hours.toFixed(1)}h
                                    </div>
                                    <div className="text-xs text-muted-foreground">Weekly Average</div>
                                </div>
                                <div className={`flex justify-center items-center p-4 rounded-lg bg-muted/50 border shadow ${stats.is_online ? 'bg-green-300' : 'bg-muted'}`}>
                                    <div className="text-lg font-bold">
                                        {stats.is_online ? 'On Duty' : 'Off Duty'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No performance data available.
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Recent Activity Tab */}
                <TabsContent value="activity" className="mt-4">
                    <Card className='py-2'>
                        <CardContent>
                            {isTabLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : recentActivity.length > 0 ? (
                                <div className="space-y-3">
                                    {recentActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between py-3 border-b last:border-0"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {new Date(activity.time_in!).toLocaleDateString()}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(activity.time_in!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {activity.time_out && (
                                                        <> - {new Date(activity.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {activity.invalidated_at ? (
                                                    <span className="text-destructive text-sm">Invalidated</span>
                                                ) : activity.time_out ? (
                                                    <span className="font-semibold text-xl">
                                                        {activity.duration_minutes
                                                            ? `${Math.floor(activity.duration_minutes / 60)}h ${activity.duration_minutes % 60}m`
                                                            : '-'
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-green-500 text-sm">Active</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No recent activity.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="mt-4">
                    <div className="text-center py-8 text-muted-foreground">
                        Schedule feature coming soon.
                    </div>
                </TabsContent>
            </Tabs>

            {/* Dialogs (Profile Mode Only) */}
            {mode === 'profile' && (
                <>
                    <ProfilePictureDialog
                        open={isPictureDialogOpen}
                        onOpenChange={setIsPictureDialogOpen}
                    />
                    <SelfChangePasswordDialog
                        open={isPasswordDialogOpen}
                        onOpenChange={setIsPasswordDialogOpen}
                    />
                    <EditProfileDialog
                        open={isEditProfileOpen}
                        onOpenChange={setIsEditProfileOpen}
                        onSuccess={fetchProfile}
                    />
                </>
            )}
        </div>
    );
}

export default UserProfile;
