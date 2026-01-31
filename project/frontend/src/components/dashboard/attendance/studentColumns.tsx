"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ActivityRecord } from "@/types"
import { Badge } from "@/components/ui/badge"
import { InfoIcon } from "lucide-react"

// Read-Only Status Cell (No action buttons)
const StatusCell = ({ row }: { row: any }) => {
    const activity = row.original;
    const isInvalid = !!activity.invalidated_at;

    if (isInvalid) {
        return (
            <Badge variant="destructive" title={activity.invalidation_notes || 'No reason provided'}>
                Invalidated
            </Badge>
        );
    }

    const timeIn = new Date(activity.time_in);
    const today = new Date();
    const isSameDay = timeIn.toDateString() === today.toDateString();
    const diffHours = (today.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

    const isActive = !activity.time_out && isSameDay && diffHours < 24;
    const isOverdue = !activity.time_out && (!isSameDay || diffHours >= 24);

    if (isActive) {
        return (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 cursor-pointer">
                Active
            </Badge>
        );
    }

    if (isOverdue) {
        return (
            <div className="flex items-center" title="Incomplete Activities (no time out data)">
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 cursor-pointer">
                    Overdue
                </Badge>
                <InfoIcon className="h-4 text-orange-600" />
            </div>
        );
    }

    return <Badge variant="secondary" className=" cursor-pointer">Completed</Badge>;
}

// Student-facing columns (Read-Only, no select or actions)
export const studentColumns: ColumnDef<ActivityRecord>[] = [
    {
        accessorKey: "job",
        header: "Job",
        cell: ({ row }) => {
            const properties = row.original.properties as any;
            const jobName = properties?.job_information?.name;
            return jobName ? <span className="font-medium">{jobName}</span> : "-";
        }
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            const date = row.original.time_in ? new Date(row.original.time_in) : null
            return date ? date.toLocaleDateString() : '-'
        }
    },
    {
        accessorKey: "time_in",
        header: "Time In",
        cell: ({ row }) => {
            const date = row.original.time_in ? new Date(row.original.time_in) : null
            return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
        }
    },
    {
        accessorKey: "time_out",
        header: "Time Out",
        cell: ({ row }) => {
            const date = row.original.time_out ? new Date(row.original.time_out) : null
            return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                row.original.invalidated_at ? '-' : <span className="text-sm text-muted-foreground">-</span>
            )
        }
    },
    {
        accessorKey: "duration_minutes",
        header: "Duration",
        cell: ({ row }) => {
            const duration = row.original.duration_minutes

            if (duration === null || duration === undefined) return '-'

            const hours = Math.floor(duration / 60);
            const minutes = Math.round(duration % 60);

            return (
                <div className="font-medium whitespace-nowrap">
                    {hours > 0 && (
                        <>
                            <span className="text-foreground">{hours}</span>
                            <span className="text-muted-foreground text-xs font-normal ml-0.5 mr-1.5">h</span>
                        </>
                    )}
                    {(minutes > 0 || hours === 0) && (
                        <>
                            <span className="text-foreground">{minutes}</span>
                            <span className="text-muted-foreground text-xs font-normal ml-0.5">m</span>
                        </>
                    )}
                </div>
            )
        }
    },
    {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusCell row={row} />
    }
]
