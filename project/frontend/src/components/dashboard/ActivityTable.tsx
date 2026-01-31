
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ProfilePicture } from '@/components/ProfilePicture';
import type { ActivityRecord } from '@/types';

interface ActivityTableProps {
    activities: ActivityRecord[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
    return (
        <div className="flex-1 overflow-auto custom-scrollbar relative">
            <Table>
                <TableHeader className="bg-slate-900/90 sticky top-0 backdrop-blur-sm z-10 shadow-sm border-b border-b-muted">
                    <TableRow className="hover:bg-slate-800/80 border-none">
                        <TableHead className="text-slate-300 font-black w-1/3">Student Name</TableHead>
                        <TableHead className="text-slate-300 font-black text-center">Time In</TableHead>
                        <TableHead className="text-slate-300 font-black text-center">Time Out</TableHead>
                        <TableHead className="text-slate-300 font-black text-right">Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activities.length > 0 ? (
                        activities.map((record) => {
                            // Parse name for initials
                            const nameParts = (record.account_name || '').split(' ');
                            const firstName = nameParts[0] || null;
                            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;

                            return (
                                <TableRow key={`${record.account_id}-${record.time_in}`} className="hover:bg-slate-800/40 transition-colors border-none">
                                    <TableCell className="font-medium text-slate-200 capitalize">
                                        <div className="flex items-center gap-2">
                                            <ProfilePicture
                                                src={record.account_profile_picture}
                                                firstName={firstName}
                                                lastName={lastName}
                                                size="md"
                                                shape='square'
                                                className='border-none'
                                            />
                                            <span>{record.account_name}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center text-slate-400 font-mono text-sm">
                                        {record.time_in ? new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-center text-slate-400 font-mono text-sm">
                                        {record.time_out ? (
                                            new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        ) : (
                                            <span className="text-green-500 text-xs font-semibold px-2 py-0.5 bg-green-500/10 rounded">ACTIVE</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-400 text-sm">
                                        {record.duration_minutes !== null && record.duration_minutes !== undefined ? (
                                            <span className="text-slate-300 font-medium">
                                                {(() => {
                                                    const hours = Math.floor(record.duration_minutes / 60);
                                                    const minutes = Math.round(record.duration_minutes % 60);

                                                    if (hours > 0) {
                                                        return (
                                                            <>
                                                                <b className="text-slate-200">{hours}</b>
                                                                <span className="text-slate-400 text-xs ml-0.5 mr-1.5">h</span>
                                                                {minutes > 0 && (
                                                                    <>
                                                                        <b className="text-slate-200">{minutes}</b>
                                                                        <span className="text-slate-400 text-xs ml-0.5">m</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <b className="text-slate-200">{minutes}</b>
                                                            <span className="text-slate-400 text-xs ml-0.5">m</span>
                                                        </>
                                                    );
                                                })()}
                                            </span>
                                        ) : (
                                            ''
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-slate-500 italic">
                                No activity recorded yet today.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
