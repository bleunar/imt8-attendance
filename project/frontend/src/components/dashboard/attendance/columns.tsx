"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ActivityRecord } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    MoreHorizontal,
    Pencil,
    Ban,
    CheckCircle2,
    Trash2,
    Info,
    RefreshCcw
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdjustTimeDialog } from "./AdjustTimeDialog"
import { InvalidateActivityDialog } from "./InvalidateActivityDialog"
import { DeleteActivityDialog } from "./DeleteActivityDialog"
import { CloseActivityDialog } from "./CloseActivityDialog"
import { InvalidationDetailsDialog } from "./InvalidationDetailsDialog"
import { attendanceService } from "@/services/attendanceService"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

// Status Cell Component to manage dialog state
const StatusCell = ({ row }: { row: any }) => {
    const [showDetails, setShowDetails] = useState(false)
    const activity = row.original;
    const isInvalid = !!activity.invalidated_at;


    const refreshData = () => {
        row.getAllCells()[0].getContext().table.options.meta?.refreshData?.();
    };

    if (isInvalid) {
        return (
            <>
                <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                        Invalidated
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShowDetails(true)}
                        title="View Reason"
                    >
                        <Info className="h-4 w-4" />
                        <span className="sr-only">View Invalidation Reason</span>
                    </Button>
                </div>

                <InvalidationDetailsDialog
                    activity={activity}
                    open={showDetails}
                    onOpenChange={setShowDetails}
                    onSuccess={refreshData}
                />
            </>
        );
    }

    const timeIn = new Date(activity.time_in);
    const today = new Date();
    const isSameDay = timeIn.toDateString() === today.toDateString();
    const diffHours = (today.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

    // Active = No time out AND created today AND less than 24 hours (sanity check)
    const isActive = !activity.time_out && isSameDay && diffHours < 24;

    // Overdue = No time out AND (Different day OR > 24 hours)
    const isOverdue = !activity.time_out && (!isSameDay || diffHours >= 24);

    if (isActive) {
        return (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                Active
            </Badge>
        );
    }

    if (isOverdue) {
        return (
            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50" title="The user may have forgot to time out, FIX THIS!">
                Overdue
            </Badge>
        );
    }

    return <Badge variant="secondary">Completed</Badge>;
}

// Action Cell Component to manage dialog state
const ActionCell = ({ row }: { row: any }) => {
    const [showAdjust, setShowAdjust] = useState(false)
    const [showInvalidate, setShowInvalidate] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [showClose, setShowClose] = useState(false)

    const activity = row.original;
    const isActive = !activity.time_out;
    const isInvalid = !!activity.invalidated_at;

    const refreshData = () => {
        row.getAllCells()[0].getContext().table.options.meta?.refreshData?.();
    };

    const handleRevalidate = async () => {
        try {
            await attendanceService.revalidate(activity.id);
            toast.success('Activity revalidated');
            refreshData();
        } catch (error) {
            toast.error('Failed to revalidate activity');
            console.error(error);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    {isInvalid ? (
                        <>
                            <DropdownMenuItem onClick={handleRevalidate} className="text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Revalidate
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <>
                            {isActive ? (
                                <DropdownMenuItem onClick={() => setShowClose(true)} className="text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Close Activity
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => setShowAdjust(true)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Adjust Time
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => setShowInvalidate(true)} className="text-orange-600 focus:text-orange-600 focus:bg-orange-50">
                                <Ban className="mr-2 h-4 w-4" />
                                Invalidate
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Permanently
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AdjustTimeDialog
                activity={activity}
                open={showAdjust}
                onOpenChange={setShowAdjust}
                onSuccess={refreshData}
            />

            <CloseActivityDialog
                activity={activity}
                open={showClose}
                onOpenChange={setShowClose}
                onSuccess={refreshData}
            />

            <InvalidateActivityDialog
                activity={activity}
                open={showInvalidate}
                onOpenChange={setShowInvalidate}
                onSuccess={refreshData}
            />

            <DeleteActivityDialog
                activity={activity}
                open={showDelete}
                onOpenChange={setShowDelete}
                onSuccess={refreshData}
            />
        </>
    )
}

export const columns: ColumnDef<ActivityRecord>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "account_name",
        header: "Student",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                        {(row.original.account_name || 'S').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.account_name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{row.original.school_id}</span>
                </div>
            </div>
        ),
    },
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
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <ActionCell row={row} />
    }
]
