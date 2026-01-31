import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { attendanceService } from '@/services/attendanceService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import type { ActivityRecord } from '@/types';
import logo from '@/assets/img/logo/logo.png';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Screensaver } from '@/components/Screensaver';
import { ProfilePicture } from '@/components/ProfilePicture';

export default function TimeInOutPage() {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    if (isAuthenticated && !isAuthLoading) {
        return <Navigate to="/dashboard" replace />;
    }

    const [schoolId, setSchoolId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeStudents, setActiveStudents] = useState<string[]>([]);
    const [todaysActivity, setTodaysActivity] = useState<ActivityRecord[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const inputRef = useRef<HTMLInputElement>(null);

    // Early Timeout Dialog State
    const [showEarlyTimeoutDialog, setShowEarlyTimeoutDialog] = useState(false);
    const [pendingSchoolId, setPendingSchoolId] = useState('');

    const fetchActiveStudents = async () => {
        try {
            // Get start of today in local time
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const dateFrom = startOfToday.toISOString();

            const students = await attendanceService.getPublicActiveSessions(dateFrom);
            setActiveStudents(students);
        } catch (error) {
            console.error('Failed to fetch active students', error);
        }
    };

    const fetchTodaysActivity = async () => {
        try {
            // Get start of today in local time
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const dateFrom = startOfToday.toISOString();

            const records = await attendanceService.getPublicTodayActivity(dateFrom);
            setTodaysActivity(records);
        } catch (error) {
            console.error('Failed to fetch today activity', error);
        }
    };

    const refreshData = () => {
        fetchActiveStudents();
        fetchTodaysActivity();
    };

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Auto-focus input on mount & Clock Timer
    useEffect(() => {
        inputRef.current?.focus();

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ...

    const processPunch = async (idToUse: string, force: boolean = false) => {
        setIsLoading(true);
        try {
            const response = await attendanceService.punch(idToUse, force);
            toast.custom(() => (
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-lg w-full max-w-md pointer-events-auto">
                    <ProfilePicture
                        src={response.profile_picture}
                        firstName={response.student_name.split(' ')[0]}
                        lastName={response.student_name.split(' ').slice(1).join(' ')}
                        size="lg"
                        shape="square"
                    />
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-nowrap text-lg text-capitalize text-slate-900 dark:text-white">
                            {response.title}
                        </h3>
                        <p className="text-slate-600 text-nowrap dark:text-slate-300">
                            {response.message}
                        </p>
                    </div>
                </div>
            ), { duration: 4000 });

            setSchoolId('');
            setPendingSchoolId('');
            refreshData();
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            const errorObj = err as any;
            if (errorObj.response?.status === 409 && errorObj.response?.data?.detail === 'EARLY_TIMEOUT_WARNING') {
                setPendingSchoolId(idToUse);
                setShowEarlyTimeoutDialog(true);
            } else {
                const errorMessage = errorObj.response?.data?.detail || 'An error occurred. Please try again.';
                toast.error(errorMessage);
                setSchoolId('');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!schoolId.trim()) {
            toast.error('Please enter your School ID');
            return;
        }

        await processPunch(schoolId.trim(), false);
    };

    const handleConfirmEarlyTimeout = async () => {
        setShowEarlyTimeoutDialog(false);
        if (pendingSchoolId) {
            await processPunch(pendingSchoolId, true);
        }
    };

    const nav = useNavigate();

    return (
        <div className="h-screen relative">
            <Screensaver />

            {/* Background placeholder removed, handled by layout */}

            {/* Main Content */}
            <div className="flex flex-col items-center h-full p-6 relative z-10 w-full overflow-y-auto">
                {/* Activity Toggle (Visible on all screens) */}
                <div className="absolute top-4 right-4 z-50">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetContent side="right" className="bg-slate-900 border-l border-slate-800 text-white w-full md:max-w-lg p-0 z-[100]">
                            <SheetHeader className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                                <SheetTitle className="text-white flex items-center gap-2">
                                    <span className=' opacity-0'>Gin ubra dya ni tonyo hehehehhehehe</span>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="p-4 max-h-[89vh] flex flex-col scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-slate-600 transition-colors duration-300">
                                <ActivityTable activities={todaysActivity} />
                            </div>
                            <SheetFooter className='pt-0 mt-0 hidden'>
                                <div className="flex justify-start">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsSheetOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex-1 flex flex-col justify-center w-full max-w-md space-y-4">

                    <div className="flex flex-col items-center justify-center text-center mb-8 animate-in fade-in duration-500">
                        <img src={logo} alt="ITSD Logo" className="w-32 h-32 object-contain hidden" />
                        <h1 className="text-4xl font-bold text-white text tracking-tight">ITSD<span className="text-blue-600">Attendance</span></h1>
                        <div className="text-slate-400 text-sm mt-2">
                            Enter your <b>School ID Number</b> to punch in/out
                        </div>
                    </div>

                    {/* Branding */}
                    <Card className="bg-slate-700/80 border-none backdrop-blur-md shadow-xl gap-y-2 animate-in fade-in duration-700">
                        <CardContent className="flex flex-col md:flex-row items-center md:items-end justify-center md:justify-between">
                            <div className="text-2xl font-bold text-white tracking-widest">
                                {currentTime.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-slate-400 font-medium tracking-wide text-sm">
                                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                        </CardContent>

                        <CardContent className='pt-2'>
                            <form onSubmit={handleSubmit} className="space-y-4 mb-0">
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="School ID Number"
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                    className={
                                        `text-center bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${schoolId ? "font-bold uppercase" : "font-normal"
                                        }`
                                    }
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                                <div className="flex justify-between items-center mt-0 pt-2">
                                    <div className="flex">
                                        <Button type='button' size="sm" variant='link' className="text-sm text-slate-500" onClick={() => nav("/login")}>
                                            Login
                                        </Button>
                                        <Button
                                            id='activity_trigger_here'
                                            size="sm"
                                            variant='link'
                                            className='text-sm text-slate-500'
                                            type="button"
                                            onClick={() => setIsSheetOpen(true)}
                                        >
                                            Activities
                                        </Button>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            'Submit'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {(activeStudents.length > 0) && (
                    <div className="absolute bottom-12 md:bottom-6 left-0 w-full text-center px-6 z-20 animate-in fade-in duration-1100">
                        <div className="text-sm text-center text-slate-500 mb-2">On Duty</div>
                        <div className="flex flex-wrap justify-center gap-2 max-h-32 px-[48px] ">
                            {(activeStudents.length > 0) && (
                                activeStudents.map((name, i) => (
                                    <div key={i} className="bg-slate-800/80 border border-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs shadow-sm backdrop-blur-md flex items-center animate-in fade-in zoom-in duration-300 cursor-pointer capitalize" onClick={() => setIsSheetOpen(true)}>
                                        <span className="w-1.5 h-1.5 inline-block bg-green-500 rounded-full mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                        {name}
                                    </div>
                                ))
                            )
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Early Timeout Warning Dialog */}
            <AlertDialog open={showEarlyTimeoutDialog} onOpenChange={setShowEarlyTimeoutDialog}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Early Timeout Warning</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            You have worked for <strong>less than 10 minutes</strong>.
                            <br /><br />
                            If you proceed, this activity will be <strong>INVALID</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel
                            onClick={() => {
                                setSchoolId('');
                                setPendingSchoolId('');
                                setTimeout(() => inputRef.current?.focus(), 100);
                            }}
                            className="bg-green-600 text-white hover:bg-green-700 hover:text-white border-none"
                        >
                            Cancel (Stay Active)
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmEarlyTimeout}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Continue (Invalidate)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
