
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProfilePicture } from "@/components/ProfilePicture"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, User as UserIcon, Pencil, Key, Briefcase, RefreshCw, Ban, Trash2, ImageOff } from "lucide-react"
import type { User } from "@/types"

interface GetColumnsProps {
    onViewProfile: (user: User) => void
    onEdit: (user: User) => void
    onPassword: (user: User) => void
    onJob: (user: User) => void
    onSuspend: (user: User) => void
    onRestore: (user: User) => void
    onDelete: (user: User) => void
    onRemovePicture: (user: User) => void
    currentUser: User | null
}

export const getColumns = ({
    onViewProfile,
    onEdit,
    onPassword,
    onJob,
    onSuspend,
    onRestore,
    onDelete,
    onRemovePicture,
    currentUser,
}: GetColumnsProps): ColumnDef<User>[] => {

    const canManage = (targetAccount: User) => {
        if (currentUser?.role === 'admin') return true;
        if (currentUser?.role === 'manager' && targetAccount.role === 'student') return true;
        return false;
    };

    const canDelete = currentUser?.role === 'admin';

    return [
        {
            accessorKey: "name", // Virtual accessor
            header: "Name",
            cell: ({ row }) => {
                const user = row.original

                return (
                    <div className="flex items-center gap-3">
                        <ProfilePicture
                            src={user.profile_picture}
                            firstName={user.first_name}
                            lastName={user.last_name}
                            size="sm"
                        />
                        <div className="flex flex-col">
                            <span className="font-medium">{user.first_name} {user.last_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                )
            },
        },
        {
            header: "School ID",
            cell: ({ row }) => row.original.school_id || ''
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const role = row.getValue("role") as string
                return (
                    <Badge variant={
                        role === 'admin' ? 'default' :
                            role === 'manager' ? 'secondary' : 'outline'
                    }
                        className="capitalize"
                    >
                        {role}
                    </Badge>
                )
            }
        },
        {
            header: "Course & Specialization",
            cell: ({ row }) => {
                const { role, department, course, year_level } = row.original

                if (role === 'student') {
                    if (!course && !year_level) return '-';

                    let yearInfo = '';
                    let yearCount = 0;
                    if (year_level) {
                        const year = Math.floor(year_level);
                        const sem = Math.round((year_level % 1) * 10);
                        yearInfo = `${sem === 1 ? '1st' : sem === 2 ? '2nd' : sem} Sem`;
                        yearCount = year;
                    }

                    return (
                        <div className="flex flex-col">
                            <span>{course ? `${course} ${yearCount || ""}` : "-"}</span>
                            {yearInfo && <span className="text-xs text-muted-foreground">{yearInfo}</span>}
                        </div>
                    )
                }

                // For admin/manager
                return (

                        <div className="flex flex-col">
                            <span className="capitalize">{department ? department : ""}</span>
                            <span className="capitalize text-xs text-muted-foreground">{course ? course : ""}</span>
                        </div>
                )
                
                department || '-'
            }
        },
        {
            accessorKey: "current_job",
            header: "Job",
            cell: ({ row }) => row.original.current_job || ''
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const isSuspended = !!row.original.suspended_at
                return isSuspended ? (
                    <Badge variant="destructive">Suspended</Badge>
                ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original

                if (!canManage(user)) return null

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewProfile(user)}>
                                <UserIcon className="mr-2 h-4 w-4" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPassword(user)}>
                                <Key className="mr-2 h-4 w-4" /> Change Password
                            </DropdownMenuItem>
                            {(user.role === 'student' || user.role === 'manager') && (
                                <DropdownMenuItem onClick={() => onJob(user)}>
                                    <Briefcase className="mr-2 h-4 w-4" />
                                    {user.current_job ? 'Manage Job' : 'Assign to Job'}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {user.profile_picture && (
                                <DropdownMenuItem onClick={() => onRemovePicture(user)} className="text-orange-600">
                                    <ImageOff className="mr-2 h-4 w-4" /> Remove Profile Picture
                                </DropdownMenuItem>
                            )}
                            {user.suspended_at ? (
                                <DropdownMenuItem onClick={() => onRestore(user)}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> Restore Account
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => onSuspend(user)} className="text-orange-600">
                                    <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Permanent Delete
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
