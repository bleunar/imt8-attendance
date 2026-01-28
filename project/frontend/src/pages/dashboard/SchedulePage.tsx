import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { scheduleService } from '@/services/scheduleService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';

// Define types based on backend models
type ScheduleStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

interface ScheduleOverride {
    id: number;
    account_id: number;
    date: string;
    request_notes: string;
    response_notes?: string;
    status: ScheduleStatus;
    // ... timestamps
    first_name?: string;
    last_name?: string;
}

interface DailyOverview {
    date: string;
    scheduled: Array<{ account_id: number, first_name: string, last_name: string, job_name?: string }>;
    activity: Array<{ account_id: number, time_in: string, time_out?: string }>;
    requests: ScheduleOverride[];
}

export default function SchedulePage() {
    const { user } = useAuth();
    const isManager = user?.role === 'admin' || user?.role === 'manager';

    if (isManager) {
        return <ManagerScheduleView />;
    }
    return <StudentScheduleView />;
}

// --- Student View ---

function StudentScheduleView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedule, setSchedule] = useState<{ weekdays: number[] }>({ weekdays: [] });
    const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Request Dialog
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [requestNotes, setRequestNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const data = await scheduleService.getMySchedule();
            setSchedule(data.schedule);
            setOverrides(data.overrides);
        } catch (error) {
            console.error("Failed to fetch schedule", error);
            toast.error("Failed to load schedule");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestAbsence = async () => {
        if (!selectedDate || !requestNotes.trim()) return;
        setIsSubmitting(true);
        try {
            await scheduleService.createRequest({
                date: format(selectedDate, 'yyyy-MM-dd'),
                request_notes: requestNotes
            });

            toast.success("Request submitted");
            setSelectedDate(null);
            setRequestNotes("");
            setIsRequestOpen(false);
            fetchSchedule();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };



    // Calendar Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 0-6 or 1-7 adjustment. JS day 0=Sun. DB/Python 1=Mon, 7=Sun (ISO).
    // Let's assume backend sends ISO weekdays (1=Mon).
    // date-fns getDay(): 0=Sun, 1=Mon.
    // So if DB sends 1 (Mon), date-fns is 1. If DB 7 (Sun), date-fns is 0.
    const isScheduled = (date: Date) => {
        const jsDay = date.getDay(); // 0-6 Sun-Sat
        // Convert to ISO 1-7 (Mon-Sun)
        const isoDay = jsDay === 0 ? 7 : jsDay;
        // Check if in weekdays array (which we assume is [1,2,3...])
        // Need to verify backend convention. In implementation plan I assumed ISO.
        return schedule.weekdays.includes(isoDay);
    };

    const getOverride = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return overrides.find(o => o.date === dateStr);
    };

    const handleDateClick = (date: Date) => {
        const override = getOverride(date);
        if (override) {
            // View details? For now just show toast or status
            toast.info(`Request Status: ${override.status}. Note: ${override.request_notes}`);
            return;
        }
        // Only allow future dates for new requests?
        if (date < new Date()) {
            // Maybe allow for today?
            // toast.error("Cannot request for past dates");
            // return;
        }

        setSelectedDate(date);
        setIsRequestOpen(true);
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />Loading schedule...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">My Schedule</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center px-4 font-medium min-w-[140px] justify-center text-lg text-foreground">
                        {format(currentDate, 'MMMM yyyy')}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b border-border">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="p-4 text-center text-sm font-medium text-muted-foreground">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-border bg-muted/30" />
                        ))}

                        {days.map(date => {
                            const scheduled = isScheduled(date);
                            const override = getOverride(date);
                            const isPast = date < new Date() && !isToday(date);

                            return (
                                <div
                                    key={date.toString()}
                                    className={`min-h-[120px] p-3 border-r border-b border-border transition-colors relative group
                                        ${scheduled ? 'bg-accent/40' : 'bg-muted/30 opacity-60'}
                                        ${isToday(date) ? 'ring-1 ring-inset ring-primary/50 bg-primary/5' : ''}
                                        ${!isPast && 'hover:bg-accent cursor-pointer'}
                                    `}
                                    onClick={() => !isPast && handleDateClick(date)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-medium ${isToday(date) ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {format(date, 'd')}
                                        </span>
                                        {scheduled && <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/50 text-primary">Duty</Badge>}
                                    </div>

                                    {override && (
                                        <div className={`text-xs p-1.5 rounded border mb-1 truncate
                                            ${override.status === 'Approved' ? 'bg-green-500/10 border-green-500/50 text-green-500' :
                                                override.status === 'Rejected' ? 'bg-destructive/10 border-destructive/50 text-destructive' :
                                                    override.status === 'Cancelled' ? 'bg-muted border-border text-muted-foreground' :
                                                        'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'}
                                        `}>
                                            <div className="font-semibold">{override.status}</div>
                                            {override.status === 'Pending' && "Request sent"}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Absence</DialogTitle>
                        <DialogDescription>
                            Requesting absence for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="Reason for absence..."
                            value={requestNotes}
                            onChange={e => setRequestNotes(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
                        <Button onClick={handleRequestAbsence} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- Manager View ---

function ManagerScheduleView() {
    // Shared State
    const [date, setDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-3xl font-bold text-foreground">Schedule Management</h1>
                <div className="flex gap-2 bg-muted p-1 rounded-lg border border-border">
                    <Button variant={activeTab === 'overview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>
                        Daily Overview
                    </Button>
                    <Button variant={activeTab === 'requests' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('requests')}>
                        Absence Requests
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === 'overview' && <ManagerOverview date={date} onDateChange={setDate} />}
                {activeTab === 'requests' && <ManagerRequests />}
            </div>
        </div>
    );
}

function ManagerOverview({ date, onDateChange }: { date: Date, onDateChange: (d: Date) => void }) {
    const [data, setData] = useState<DailyOverview | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchOverview();
    }, [date]);

    const fetchOverview = async () => {
        setIsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = await scheduleService.getOverview(dateStr);
            setData(data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch schedule overview");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Calendar Widget */}
            <Card className="lg:col-span-1 border-border bg-card h-fit">
                <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center pb-4">
                        {/* Use a simple custom mini calendar or date picker. For brevity, standard controls */}
                        <div className="w-full space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <Button variant="outline" size="sm" onClick={() => onDateChange(subMonths(date, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                                <span className="font-medium text-foreground">{format(date, 'MMMM yyyy')}</span>
                                <Button variant="outline" size="sm" onClick={() => onDateChange(addMonths(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid grid-cols-7 text-center text-xs gap-1">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-muted-foreground">{d}</span>)}
                                {Array.from({ length: startOfMonth(date).getDay() }).map((_, i) => <div key={i} />)}
                                {eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) }).map(d => (
                                    <button
                                        key={d.toString()}
                                        onClick={() => onDateChange(d)}
                                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors
                                            ${isSameDay(d, date) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                                            ${isToday(d) && !isSameDay(d, date) ? 'text-primary border border-primary' : ''}
                                        `}
                                    >
                                        {format(d, 'd')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Overview List */}
            <Card className="lg:col-span-2 border-border bg-card flex flex-col h-full overflow-hidden">
                <CardHeader className="border-b border-border shrink-0">
                    <CardTitle className="flex justify-between items-center text-foreground">
                        <span>Status for {format(date, 'MMMM d, yyyy')}</span>
                        {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                    </CardTitle>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Expected: {data?.scheduled?.length || 0}</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active: {data?.activity?.length || 0}</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto flex-1">
                    {!data ? (
                        <div className="p-8 text-center text-muted-foreground">Loading details...</div>
                    ) : (!data.scheduled || data.scheduled.length === 0) ? (
                        <div className="p-8 text-center text-muted-foreground">No students scheduled for this day.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {data.scheduled.map(student => {
                                const isActive = data.activity?.some(a => a.account_id === student.account_id && !a.time_out);
                                const request = data.requests?.find(r => r.account_id === student.account_id);

                                return (
                                    <div key={student.account_id} className="p-4 flex items-center justify-between hover:bg-accent/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-400'}`} />
                                            <div>
                                                <div className="font-medium text-foreground">{student.first_name} {student.last_name}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{student.job_name || 'No Job Assigned'}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {request && (
                                                <Badge variant="outline" className={`
                                                    ${request.status === 'Approved' ? 'border-green-800 text-green-500' :
                                                        request.status === 'Pending' ? 'border-yellow-800 text-yellow-500' :
                                                            'border-muted-foreground text-muted-foreground'}
                                                `}>
                                                    {request.status === 'Approved' ? 'On Leave' : request.status}
                                                </Badge>
                                            )}
                                            {!isActive && !request && <Badge variant="outline" className="border-border text-muted-foreground">Absent</Badge>}
                                            {isActive && <Badge variant="default" className="bg-green-500/20 text-green-600 hover:bg-green-500/20">On Duty</Badge>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ManagerRequests() {
    const [requests, setRequests] = useState<ScheduleOverride[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewDialog, setReviewDialog] = useState<{ open: boolean, req: ScheduleOverride | null, action: 'approve' | 'reject' }>({
        open: false, req: null, action: 'approve'
    });
    const [notes, setNotes] = useState("");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:8000/schedules/requests?status_filter=Pending', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) setRequests(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async () => {
        if (!reviewDialog.req) return;
        try {
            const res = await fetch(`http://localhost:8000/schedules/requests/${reviewDialog.req.id}/${reviewDialog.action}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ response_notes: notes })
            });
            if (res.ok) {
                toast.success(`Request ${reviewDialog.action}ed`);
                setReviewDialog({ open: false, req: null, action: 'approve' });
                setNotes("");
                fetchRequests();
            }
        } catch (e) {
            toast.error("Failed to update request");
        }
    };

    return (
        <Card className="border-border bg-card h-full flex flex-col">
            <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Review absence requests from students</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="text-center p-8 text-muted-foreground">Loading...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center p-12 bg-muted/30 rounded-lg border border-border border-dashed">
                        <Check className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <h3 className="text-muted-foreground font-medium">All caught up!</h3>
                        <p className="text-muted-foreground/80">No pending requests to review.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="p-4 rounded-xl border border-border bg-muted/30">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-foreground text-lg">
                                                {format(new Date(req.date), 'MMMM d, yyyy')}
                                            </span>
                                            <Badge variant="outline" className="border-primary/50 text-primary">
                                                {format(new Date(req.date), 'EEEE')}
                                            </Badge>
                                        </div>
                                        <div className="text-muted-foreground font-medium mb-2">{req.first_name} {req.last_name}</div>
                                        <div className="bg-card p-3 rounded-lg text-sm text-muted-foreground italic border border-border">
                                            "{req.request_notes}"
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                                            onClick={() => setReviewDialog({ open: true, req: req, action: 'approve' })}
                                        >
                                            <Check className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => setReviewDialog({ open: true, req: req, action: 'reject' })}
                                        >
                                            <X className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && setReviewDialog(prev => ({ ...prev, open: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="capitalize">{reviewDialog.action} Request</DialogTitle>
                        <DialogDescription>
                            Add an optional note for the student.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Optional response note..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReviewDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button
                            variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
                            onClick={handleAction}
                        >
                            Confirm {reviewDialog.action === 'approve' ? 'Approval' : 'Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
