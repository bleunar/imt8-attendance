/**
 * Dashboard Home Page
 * 
 * Overview of system status and recent activity.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SystemStatusDialog } from '@/components/dashboard/SystemStatusDialog';
import type { SystemStatus } from '@/services/systemService';
import { Activity, Users, Clock, CheckCircle, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import attendanceService from '@/services/attendanceService';
import performanceService from '@/services/performanceService';
import systemService from '@/services/systemService';
import type { ActivityRecord, StudentSummary, PerformanceStat } from '@/types';
import { ProfilePicture } from '@/components/ProfilePicture';

export default function HomePage() {
    const { user } = useAuth();
    const [activeSessions, setActiveSessions] = useState<ActivityRecord[]>([]);
    const [overdueCount, setOverdueCount] = useState<number>(0);
    const [todaysSummary, setTodaysSummary] = useState<StudentSummary[]>([]);
    const [studentStats, setStudentStats] = useState<PerformanceStat | null>(null);
    const [selectedInvalidActivity, setSelectedInvalidActivity] = useState<ActivityRecord | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>({
        status: 'online',
        database: 'online',
        email_service: 'online'
    });
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            if (user?.role === 'admin' || user?.role === 'manager') {
                // Fetch admin/manager data
                const [active, overdue, summary] = await Promise.all([
                    attendanceService.getActiveSessions(),
                    attendanceService.getOverdueCount(),
                    attendanceService.getSummary({
                        date_from: (() => {
                            const d = new Date();
                            d.setHours(0, 0, 0, 0);
                            return d.toISOString();
                        })(),
                    }),
                ]);
                setActiveSessions(active);
                setOverdueCount(overdue);
                setTodaysSummary(summary.items);

                // Fetch system status separately without blocking
                systemService.getStatus().then(status => {
                    setSystemStatus(status);
                }).catch(err => console.error('Failed to fetch system status', err));

            } else if (user?.role === 'student') {
                // Fetch student data
                const [stats, history] = await Promise.all([
                    performanceService.getStats(),
                    attendanceService.getStudentActivities(user.id, 1, 20)
                ]);

                if (stats.items.length > 0) {
                    setStudentStats(stats.items[0]);
                }
                setActiveSessions(history.items);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every 1 minute
        return () => clearInterval(interval);
    }, [user]);

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

    return (
        <>
            <div className="space-y-6">

                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground text-lg">
                        Welcome! <b>{user?.first_name}</b>
                    </p>
                </div>

                {isAdminOrManager ? (
                    <>
                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Active Sessions
                                    </CardTitle>
                                    <Activity className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">{activeSessions.length}</div>
                                    <p className="text-xs text-muted-foreground text-center">Users On Duty</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Total Students Today
                                    </CardTitle>
                                    <Users className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">{todaysSummary.length}</div>
                                    <p className="text-xs text-muted-foreground text-center">People that have dutied today</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Total Hours rendered Today
                                    </CardTitle>
                                    <Clock className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">
                                        {(() => {
                                            const totalMinutes = todaysSummary.reduce((acc, curr) => acc + curr.total_minutes, 0);
                                            const hours = Math.floor(totalMinutes / 60);
                                            const minutes = Math.round(totalMinutes % 60);
                                            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                        })()}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Combined time rendered by students</p>
                                </CardContent>
                            </Card>

                            <Card
                                className="bg-muted/50 border-border gap-1 cursor-pointer hover:bg-muted/50 transition-colors group relative"
                                onClick={() => setIsStatusDialogOpen(true)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        System Status
                                    </CardTitle>
                                    <CheckCircle className={`h-4 w-4 ${systemStatus?.status === 'online' ? 'text-green-500' : 'text-yellow-500'}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">
                                        {systemStatus?.status === 'online' ? 'Online' : 'Degraded'}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        View to click details
                                    </p>
                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <SystemStatusDialog
                            open={isStatusDialogOpen}
                            onOpenChange={setIsStatusDialogOpen}
                            status={systemStatus}
                        />

                        {/* Recent Activity */}
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                            <Card className="cols bg-card border-border">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-foreground">Currently Active Students</CardTitle>
                                            <CardDescription className="text-muted-foreground">
                                                Students who are currently clocked in.
                                            </CardDescription>
                                        </div>
                                        {/* Overdue badge */}
                                        {overdueCount > 0 ? (
                                            <a
                                                href="/dashboard/attendance?status=overdue"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                                            >
                                                <AlertTriangle className="h-3 w-3" />
                                                {overdueCount} Overdue
                                            </a>
                                        ) : null}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="text-slate-400 text-sm">Loading...</div>
                                    ) : (() => {
                                        // Filter to only show truly active sessions (same day)
                                        const trulyActive = activeSessions.filter((s) => {
                                            const timeIn = new Date(s.time_in!);
                                            const now = new Date();
                                            const isSameDay = timeIn.toDateString() === now.toDateString();
                                            const diffHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
                                            return isSameDay && diffHours < 24;
                                        });

                                        return trulyActive.length === 0 ? (
                                            <div className="text-slate-400 text-sm">No active sessions right now.</div>
                                        ) : (
                                            <div className="space-y-4">
                                                {trulyActive.slice(0, 5).map((session) => (
                                                    <div key={`${session.account_id}-${session.time_in}`} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                                        <div className="flex items-center gap-4">

                                                            <ProfilePicture
                                                                src={session.account_profile_picture}
                                                                firstName={(session.account_name || '').split(' ')[0]}
                                                                lastName={(session.account_name || '').split(' ').slice(-1)[0]}
                                                                size="sm"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground capitalize">{session.account_name}</p>
                                                                <p className="text-xs text-muted-foreground">{session.school_id}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <p className="text-xs text-green-400 font-medium">Active</p>
                                                                <p className="text-xs text-slate-500">
                                                                    Since {new Date(session.time_in!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={async () => {
                                                                    if (!session.id) return;
                                                                    if (!confirm(`Close session for ${session.account_name}?`)) return;
                                                                    try {
                                                                        await attendanceService.bulkClose([session.id]);
                                                                        // Refresh active sessions
                                                                        const active = await attendanceService.getActiveSessions();
                                                                        setActiveSessions(active);
                                                                    } catch (error) {
                                                                        console.error('Failed to close session', error);
                                                                    }
                                                                }}
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Close
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>

                            <Card className="col bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground">Top Performers</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Students with the most rendered time today.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {todaysSummary.sort((a, b) => b.total_minutes - a.total_minutes).slice(0, 5).map((student) => {
                                            const hours = Math.floor(student.total_minutes / 60);
                                            const minutes = Math.round(student.total_minutes % 60);
                                            const timeDisplay = hours > 0
                                                ? `${hours}h ${minutes}m`
                                                : `${minutes}m`;

                                            return (
                                                <div key={student.account_id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <ProfilePicture
                                                            src={undefined}
                                                            firstName={(student.account_name || '').split(' ')[0]}
                                                            lastName={(student.account_name || '').split(' ').slice(-1)[0]}
                                                            size="sm"
                                                            shape='square'
                                                        />
                                                        <span className="text-sm text-foreground">{student.account_name}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {timeDisplay}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {todaysSummary.length === 0 && (
                                            <div className="text-slate-400 text-sm">No activity recorded today.</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    /* Student View */
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Total Hours
                                    </CardTitle>
                                    <Clock className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">
                                        {studentStats ? (() => {
                                            const totalMinutes = studentStats.total_rendered_hours * 60;
                                            const hours = Math.floor(totalMinutes / 60);
                                            const minutes = Math.round(totalMinutes % 60);
                                            if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                                            if (hours > 0) return `${hours}h`;
                                            return `${minutes}m`;
                                        })() : '0m'}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Total rendered time</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Daily Average
                                    </CardTitle>
                                    <Activity className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">
                                        {studentStats ? (() => {
                                            const totalMinutes = studentStats.avg_daily_hours * 60;
                                            const hours = Math.floor(totalMinutes / 60);
                                            const minutes = Math.round(totalMinutes % 60);
                                            if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                                            if (hours > 0) return `${hours}h`;
                                            return `${minutes}m`;
                                        })() : '0m'}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Average hours per active day</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50 border-border gap-1">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Weekly Average
                                    </CardTitle>
                                    <Activity className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl my-2 font-bold text-foreground text-center">
                                        {studentStats ? (() => {
                                            const totalMinutes = studentStats.avg_weekly_hours * 60;
                                            const hours = Math.floor(totalMinutes / 60);
                                            const minutes = Math.round(totalMinutes % 60);
                                            if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                                            if (hours > 0) return `${hours}h`;
                                            return `${minutes}m`;
                                        })() : '0m'}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Average hours per week</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Attendance List */}
                        <Card className="bg-muted/50 border-border gap-1">
                            <CardHeader className='border-b'>
                                <CardTitle className="text-foreground">Recent Activity</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Your recent attendance records.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='pt-4'>
                                {isLoading ? (
                                    <div className="text-slate-400 text-sm">Loading...</div>
                                ) : activeSessions.length === 0 ? (
                                    <div className="text-slate-400 text-sm">No recent activity recorded.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeSessions.map((activity) => {
                                            // Calculate status like the AttendancePage
                                            const isInvalid = !!activity.invalidated_at;
                                            const timeIn = new Date(activity.time_in!);
                                            const today = new Date();
                                            const isSameDay = timeIn.toDateString() === today.toDateString();
                                            const diffHours = (today.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
                                            const isActive = !activity.time_out && isSameDay && diffHours < 24;
                                            const isOverdue = !activity.time_out && (!isSameDay || diffHours >= 24);
                                            const isCompleted = !!activity.time_out && !isInvalid;

                                            return (
                                                <div key={`${activity.account_id}-${activity.time_in}`} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {new Date(activity.time_in!).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(activity.time_in!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                            {activity.time_out ? new Date(activity.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' Present'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* Duration (if completed) */}
                                                        {isCompleted && activity.duration_minutes && (
                                                            <span className="text-sm font-bold text-foreground">
                                                                {(() => {
                                                                    const hours = Math.floor(activity.duration_minutes / 60);
                                                                    const minutes = Math.round(activity.duration_minutes % 60);
                                                                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                                                })()}
                                                            </span>
                                                        )}

                                                        {/* Status Badge */}
                                                        {isInvalid ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                                                    Invalidated
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setSelectedInvalidActivity(activity)}
                                                                >
                                                                    <Info className="h-4 w-4" />
                                                                    <span className="sr-only">Info</span>
                                                                </Button>
                                                            </div>
                                                        ) : isActive ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                                                Active
                                                            </span>
                                                        ) : isOverdue ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                                Overdue
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                                Completed
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <Dialog open={!!selectedInvalidActivity} onOpenChange={(open) => !open && setSelectedInvalidActivity(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Activity Invalidated</DialogTitle>
                        <DialogDescription>
                            This activity record was invalidated by an administrator.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 rounded-md bg-muted/50 border border-border">
                            <h4 className="text-sm font-medium mb-1 text-foreground">Reason</h4>
                            <p className="text-sm text-muted-foreground">
                                {selectedInvalidActivity?.invalidation_notes || "No reason provided."}
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
