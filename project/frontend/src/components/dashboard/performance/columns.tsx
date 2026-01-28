import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PerformanceStat } from '@/types';

interface ColumnsProps {
    onViewHistory: (student: PerformanceStat) => void;
    onAdjust?: (student: PerformanceStat) => void;
}

export const columns = ({ onViewHistory, onAdjust }: ColumnsProps): ColumnDef<PerformanceStat>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const name = row.getValue('name') as string;
            const schoolId = row.original.school_id;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                            {(name || 'NN').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        {schoolId && (
                            <span className="text-xs text-muted-foreground">{schoolId}</span>
                        )}
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: 'job_name',
        header: 'Job',
        cell: ({ row }) => {
            const val = row.getValue('job_name') as string | undefined;
            return <div>{val || '-'}</div>;
        }
    },
    {
        accessorKey: 'is_online',
        header: 'Status',
        cell: ({ row }) => {
            const isOnline = row.getValue('is_online') as boolean;
            return (
                <div className="flex items-center">
                    {isOnline ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                            On Duty
                        </span>
                    ) : (
                        <span className="text-slate-500 text-xs">Off Duty</span>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: 'total_rendered_hours',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Total Hours
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const val = row.getValue('total_rendered_hours') as number;
            const hours = Math.floor(val);
            const minutes = Math.round((val - hours) * 60);
            return <div className="pl-4 font-bold">{hours}h {minutes}m</div>;
        }
    },
    {
        accessorKey: 'avg_daily_hours',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Avg. Daily
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const val = row.getValue('avg_daily_hours') as number;
            const hours = Math.floor(val);
            const minutes = Math.round((val - hours) * 60);
            return <div className="pl-4">{hours}h {minutes}m</div>;
        }
    },
    {
        accessorKey: 'avg_weekly_hours',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Avg. Weekly
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const val = row.getValue('avg_weekly_hours') as number;
            const hours = Math.floor(val);
            const minutes = Math.round((val - hours) * 60);
            return <div className="pl-4">{hours}h {minutes}m</div>;
        }
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div className="flex items-center gap-2">
                    {onAdjust && (
                        <Button variant="outline" size="sm" onClick={() => onAdjust(student)}>
                            <Clock className="h-4 w-4 mr-1" /> Adjust
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onViewHistory(student)}>
                        View History
                    </Button>
                </div>
            );
        },
    },
];

