import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/dashboard/jobs/columns';
import { jobService } from '@/services/jobService';
import type { Job, JobFilters } from '@/types';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';

import { CreateJobDialog } from './jobs/CreateJobDialog';
import { JobMembersDialog } from './jobs/JobMembersDialog';

export default function JobsPage() {
    const { user: currentUser } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<JobFilters>({
        page: 1,
        page_size: 10,
        search: '',
    });
    const [totalPages, setTotalPages] = useState(1);

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const response = await jobService.list(filters);
            setJobs(response.items);
            setTotalPages(response.total_pages);
        } catch (error: any) {
            toast.error('Failed to fetch jobs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [filters]);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleEdit = (job: Job) => {
        setSelectedJob(job);
        setIsCreateOpen(true);
    };

    const handleManageMembers = (job: Job) => {
        setSelectedJob(job);
        setIsMembersOpen(true);
    };

    const handleDelete = async (job: Job) => {
        if (!confirm(`Are you sure you want to delete ${job.name}? This will unassign all members.`)) return;
        try {
            await jobService.delete(job.id);
            toast.success('Job deleted successfully');
            fetchJobs();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to delete job');
        }
    };

    const isAdmin = currentUser?.role === 'admin';
    const canCreate = isAdmin;

    const columns = useMemo(() => getColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onManageMembers: handleManageMembers,
        isAdmin
    }), [isAdmin]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Jobs Management</h2>
                    <p className="text-muted-foreground">
                        Manage the jobs that are offered to students and staff
                    </p>
                </div>
                {canCreate && (
                    <Button onClick={() => { setSelectedJob(null); setIsCreateOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Create Job
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden">
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-sm">
                            <Input
                                placeholder="Search jobs..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                            <Button type="submit" variant="secondary">
                                <Search className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    <DataTable
                        columns={columns}
                        data={jobs}
                        isLoading={isLoading}
                        pagination={{
                            currentPage: filters.page || 1,
                            totalPages: totalPages,
                            onPageChange: (page) => setFilters(prev => ({ ...prev, page }))
                        }}
                    />
                </CardContent>
            </Card>

            <CreateJobDialog
                job={selectedJob}
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={() => fetchJobs()}
            />

            <JobMembersDialog
                job={selectedJob}
                open={isMembersOpen}
                onOpenChange={setIsMembersOpen}
            />
        </div>
    );
}
