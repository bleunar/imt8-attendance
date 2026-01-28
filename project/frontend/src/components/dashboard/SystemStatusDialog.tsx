import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Server, Mail, Calendar } from 'lucide-react';
import type { SystemStatus } from '@/services/systemService';
import { Separator } from '@/components/ui/separator';

interface SystemStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status: SystemStatus | null;
}

export function SystemStatusDialog({ open, onOpenChange, status }: SystemStatusDialogProps) {
    if (!status) return null;

    const StatusBadge = ({ state }: { state: string }) => {
        const isOnline = state === 'online' || state === 'running' || state === 'active';
        return (
            <Badge variant={isOnline ? 'default' : 'destructive'} className={isOnline ? 'bg-green-500 hover:bg-green-600 cursor-pointer' : ' cursor-pointer'}>
                {isOnline ? (
                    <CheckCircle className="mr-1 h-3 w-3" />
                ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                )}
                {state.charAt(0).toUpperCase() + state.slice(1)}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        System Status
                    </DialogTitle>
                    <DialogDescription>
                        Real-time health check of system components.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Core Services */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Core Services
                        </h3>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                                <Server className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="font-medium">Database</p>
                                    <p className="text-xs text-muted-foreground">Primary Log Storage</p>
                                </div>
                            </div>
                            <StatusBadge state={status.database} />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="font-medium">Email Service</p>
                                    <p className="text-xs text-muted-foreground">SMTP Relay</p>
                                </div>
                            </div>
                            <StatusBadge state={status.email_service} />
                        </div>
                    </div>

                    <Separator />

                    {/* Background Jobs */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Background Jobs (CRON)
                            </h3>
                            <Badge variant="outline" className="text-xs">
                                Scheduler: {status.scheduler.status}
                            </Badge>
                        </div>

                        {status.scheduler.jobs.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/50">
                                No active background jobs found.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {status.scheduler.jobs.map((job) => (
                                    <div key={job.id} className="p-3 rounded-lg border bg-card">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-purple-500" />
                                                <span className="font-medium">{job.name}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">Active</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                            <Clock className="h-3 w-3" />
                                            <span>Next Run:</span>
                                            <span className="font-mono text-foreground">
                                                {job.next_run
                                                    ? new Date(job.next_run).toLocaleString()
                                                    : 'Not Scheduled'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
