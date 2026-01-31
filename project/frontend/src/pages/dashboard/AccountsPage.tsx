import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/dashboard/accounts/columns';
import { accountService } from '@/services/accountService';
import { UserProfile } from '@/components/UserProfile';
import type { User, AccountFilters } from '@/types';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
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

import { CreateAccountDialog } from './accounts/CreateAccountDialog';
import { EditAccountDialog } from './accounts/EditAccountDialog';
import { ChangePasswordDialog } from './accounts/ChangePasswordDialog';
import { AccountJobDialog } from './accounts/AccountJobDialog';
import { PostCreateJobDialog } from './accounts/PostCreateJobDialog';

export default function AccountsPage() {
    const { user: currentUser } = useAuth();
    const [accounts, setAccounts] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<AccountFilters>({
        page: 1,
        page_size: 10,
        search: '',
    });
    const [totalPages, setTotalPages] = useState(1);

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [isJobOpen, setIsJobOpen] = useState(false);
    const [isPostCreateJobOpen, setIsPostCreateJobOpen] = useState(false);
    const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
    const [isMoveUpOpen, setIsMoveUpOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<User | null>(null);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const response = await accountService.list(filters);
            setAccounts(response.items);
            setTotalPages(response.total_pages);
        } catch (error) {
            toast.error('Failed to fetch accounts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [filters]);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    };

    const handleViewProfile = (account: User) => {
        setSelectedAccount(account);
        setIsViewProfileOpen(true);
    };

    const handleEdit = (account: User) => {
        setSelectedAccount(account);
        setIsEditOpen(true);
    };

    const handlePassword = (account: User) => {
        setSelectedAccount(account);
        setIsPasswordOpen(true);
    };

    const handleJob = (account: User) => {
        setSelectedAccount(account);
        setIsJobOpen(true);
    };

    const handleSuspend = async (account: User) => {
        if (!confirm(`Are you sure you want to suspend ${account.first_name}?`)) return;
        try {
            await accountService.suspend(account.id);
            toast.success('Account suspended');
            fetchAccounts();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to suspend account');
        }
    };

    const handleRestore = async (account: User) => {
        try {
            await accountService.restore(account.id);
            toast.success('Account restored');
            fetchAccounts();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to restore account');
        }
    };

    const handlePermanentDelete = async (account: User) => {
        if (!confirm(`WARNING: This is irreversible!\n\nAre you sure you want to PERMANENTLY DELETE ${account.first_name}?`)) return;
        try {
            await accountService.permanentDelete(account.id);
            toast.success('Account permanently deleted');
            fetchAccounts();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to delete account');
        }
    };

    const handleRemovePicture = async (account: User) => {
        if (!confirm(`Are you sure you want to remove the profile picture for ${account.first_name}?`)) return;
        try {
            await accountService.removeUserProfilePicture(account.id);
            toast.success('Profile picture removed');
            fetchAccounts();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to remove profile picture');
        }
    };

    const columns = useMemo(() => getColumns({
        onViewProfile: handleViewProfile,
        onEdit: handleEdit,
        onPassword: handlePassword,
        onJob: handleJob,
        onSuspend: handleSuspend,
        onRestore: handleRestore,
        onDelete: handlePermanentDelete,
        onRemovePicture: handleRemovePicture,
        currentUser
    }), [currentUser]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
                    <p className="text-muted-foreground">
                        Manage the accounts of the users
                    </p>
                </div>
                <div className="flex gap-2">
                    {currentUser?.role === 'admin' && (
                        <Button
                            variant="destructive"
                            onClick={() => setIsMoveUpOpen(true)}
                        >
                            Move Up Student
                        </Button>
                    )}
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Account
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-sm">
                            <Input
                                placeholder="Search by name, email, or School ID..."
                                value={filters.search}
                                onChange={(e) => setFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                            />
                            <Button type="submit" variant="secondary">
                                <Search className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    <DataTable
                        columns={columns}
                        data={accounts}
                        isLoading={isLoading}
                        pagination={{
                            currentPage: filters.page || 1,
                            totalPages: totalPages,
                            onPageChange: (page) => setFilters((prev: any) => ({ ...prev, page }))
                        }}
                    />
                </CardContent>
            </Card>

            <CreateAccountDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={(newAccount) => {
                    fetchAccounts();
                    if ((newAccount.role === 'student' || newAccount.role === 'manager') && !newAccount.current_job) {
                        setSelectedAccount(newAccount);
                        setTimeout(() => setIsPostCreateJobOpen(true), 300); // Small delay for UX
                    }
                }}
            />

            <EditAccountDialog
                account={selectedAccount}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={() => fetchAccounts()}
            />

            <ChangePasswordDialog
                account={selectedAccount}
                open={isPasswordOpen}
                onOpenChange={setIsPasswordOpen}
            />

            <AccountJobDialog
                account={selectedAccount}
                open={isJobOpen}
                onOpenChange={setIsJobOpen}
                onSuccess={() => fetchAccounts()}
            />

            <PostCreateJobDialog
                account={selectedAccount}
                open={isPostCreateJobOpen}
                onOpenChange={setIsPostCreateJobOpen}
                onSuccess={() => fetchAccounts()}
            />

            {/* View Profile Dialog */}
            <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
                <DialogContent className="w-full h-[85vh] overflow-y-auto">
                    {selectedAccount && (
                        <UserProfile mode="preview" user={selectedAccount} />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isMoveUpOpen} onOpenChange={setIsMoveUpOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Move Up Students?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will advance eligible students to the next year and semester.
                            Students at their 4th Year 2nd semeter (or higher) will not be changed.
                        </AlertDialogDescription>

                            <span className="text-sm font-semibold text-destructive bg-red-50 p-2 rounded">
                                WARNING: This action affects all accounts that are eligible and cannot be undone.
                            </span>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={async () => {
                                try {
                                    setIsLoading(true);
                                    const res = await accountService.moveUpStudents();
                                    toast.success(res.message);
                                    fetchAccounts();
                                } catch (error: any) {
                                    toast.error(error.response?.data?.detail || 'Failed to move up students');
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            Move Up Students
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
