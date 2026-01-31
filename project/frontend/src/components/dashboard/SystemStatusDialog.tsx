import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Server, Mail } from 'lucide-react';
import type { SystemStatus } from '@/services/systemService';

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
                                </div>
                            </div>
                            <StatusBadge state={status.database} />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="font-medium">Email Services</p>
                                </div>
                            </div>
                            <StatusBadge state={status.email_service} />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
