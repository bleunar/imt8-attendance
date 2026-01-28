
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react"
import type { Job } from "@/types"

interface GetColumnsProps {
    onEdit: (job: Job) => void
    onDelete: (job: Job) => void
    onManageMembers: (job: Job) => void
    isAdmin: boolean
}

export const getColumns = ({
    onEdit,
    onDelete,
    onManageMembers,
    isAdmin,
}: GetColumnsProps): ColumnDef<Job>[] => {
    return [
        {
            accessorKey: "name",
            header: "Job Details",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.name}</div>
                    {row.original.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[400px]" title={row.original.description}>
                            {row.original.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "department",
            header: "Department",
            cell: ({ row }) => row.original.department || '-',
        },
        {
            accessorKey: "member_count",
            header: "Members",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{row.original.member_count}</span>
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const job = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onManageMembers(job)}>
                                <Users className="mr-2 h-4 w-4" /> Manage Members
                            </DropdownMenuItem>
                            {isAdmin && (
                                <>
                                    <DropdownMenuItem onClick={() => onEdit(job)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit Job
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(job)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Job
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}
