import { useState, useEffect } from 'react';
import { Trophy, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProfilePicture } from '@/components/ProfilePicture';
import api from '@/services/api';
import windyBg from '@/assets/img/windy.jpg';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface LeaderboardEntry {
    rank: number;
    id: number;
    school_id: string;
    name: string;
    first_name: string;
    last_name: string;
    profile_picture: string | null;
    job_name: string | null;
    job_id: number | null;
    total_minutes: number;
    total_hours: number;
    total_hours_formatted: string;
    completed_count: number;
    is_online: boolean;
}

export default function LeaderboardsPage() {
    const [monthlyTop, setMonthlyTop] = useState<LeaderboardEntry[]>([]);
    const [allTimeData, setAllTimeData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboards = async () => {
        setLoading(true);
        try {
            // Get first and last day of current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const dateFrom = firstDay.toISOString().split('T')[0];
            const dateTo = lastDay.toISOString().split('T')[0];

            const [monthly, allTime] = await Promise.all([
                api.get<LeaderboardEntry[]>(`/leaderboards/top-performers?limit=8&date_from=${dateFrom}&date_to=${dateTo}`),
                api.get<LeaderboardEntry[]>(`/leaderboards/top-performers?limit=100`)
            ]);

            setMonthlyTop(monthly.data);
            setAllTimeData(allTime.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboards();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-12 w-12 text-yellow-500" />;
            case 2:
                return <Award className="h-10 w-10 text-gray-400" />;
            case 3:
                return <Award className="h-8 w-8 text-amber-600" />;
            default:
                return null;
        }
    };

    const getPodiumHeight = (rank: number) => {
        switch (rank) {
            case 1:
                return 'h-64';
            case 2:
                return 'h-48';
            case 3:
                return 'h-40';
            default:
                return 'h-32';
        }
    };

    const getPodiumOrder = () => {
        if (monthlyTop.length < 3) return [];
        return [monthlyTop[1], monthlyTop[0], monthlyTop[2]]; // 2nd, 1st, 3rd for podium layout
    };

    const chartColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Leaderboards</h1>
                <p className="text-muted-foreground">Leaderboards for the top performing students</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
            ) : (
                <>
                    {/* Monthly Top 3 Podium */}
                    <Card className="border-2 py-0 pb-2">
                        <CardHeader className="hidden">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-10 w-10 text-yellow-500" />
                                <div className="flex flex-col">
                                    <div className="text-2xl font-bold">Top Performing</div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                            <CardDescription>
                            </CardDescription>
                        </CardHeader>
                        <CardContent
                            className="pt-8 relative overflow-hidden"
                        >
                            {/* Gradient Overlay - fades from white at top to transparent */}

                            {/* Content with relative positioning to appear above gradient */}
                            <div className="relative z-10">
                                {monthlyTop.length >= 3 ? (
                                    <>
                                        {/* Podium Display */}
                                        <div className="flex items-end justify-center gap-4 mb-2 border-b pb-0 relative rounded-sm h-[60vh]"
                                            style={{
                                                backgroundImage: `url(${windyBg})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}>

                                            <div className="absolute inset-0 bg-gradient-to-b from-white via-background/80 to-transparent pointer-events-none" />

                                            {getPodiumOrder().map((entry, idx) => {
                                                const actualRank = entry.rank;
                                                const podiumHeight = getPodiumHeight(actualRank);

                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className={`flex flex-col z-1000 items-center ${idx === 1 ? 'order-2' : idx === 0 ? 'order-1' : 'order-3'}`}
                                                    >
                                                        {/* Profile Picture */}
                                                        <div className="relative mb-3">
                                                            <ProfilePicture
                                                                src={entry.profile_picture}
                                                                firstName={entry.first_name}
                                                                lastName={entry.last_name}
                                                                size={actualRank === 1 ? 'xl' : 'lg'}
                                                                className="shadow-xl scale-175"
                                                            />
                                                            {/* Rank Badge */}
                                                            <div className="absolute -bottom-8 -right-6">{getRankIcon(actualRank)}</div>
                                                        </div>

                                                        {/* Podium */}
                                                        <div
                                                            className={`${podiumHeight} w-54 rounded-t-lg flex flex-col items-center justify-start pt-4 ${actualRank === 1
                                                                ? 'bg-gradient-to-b from-yellow-500/00 to-yellow-400/100'
                                                                : actualRank === 2
                                                                    ? 'bg-gradient-to-b from-gray-300/00 to-gray-300/100'
                                                                    : 'bg-gradient-to-b from-amber-600/00 to-amber-600/100'
                                                                }`}
                                                        >
                                                            <div className="text-center mt-4">
                                                                <div className={`font-bold ${actualRank === 1 ? 'text-2xl' : 'text-md'}`}>
                                                                    {entry.name}
                                                                </div>
                                                                <div className={`mt-1 text-md`}>
                                                                    {entry.total_hours_formatted}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Runners-up (4-8) */}
                                        {monthlyTop.length > 3 && (
                                            <div className="mt-0">
                                                <div className="space-y-2">
                                                    {monthlyTop.slice(3, 8).map((entry) => (
                                                        <div
                                                            key={entry.id}
                                                            className={`flex items-center gap-4 p-4 transition-colors border-b rounded-none ${entry.rank == 8 ? "border-none" : "border-b"}`}
                                                        >
                                                            {/* Rank */}
                                                            <div className="text-2xl font-bold text-muted-foreground w-8">
                                                                #{entry.rank}
                                                            </div>

                                                            {/* Profile */}
                                                            <ProfilePicture
                                                                src={entry.profile_picture}
                                                                firstName={entry.first_name}
                                                                lastName={entry.last_name}
                                                                size="md"
                                                                shape='square'
                                                            />

                                                            {/* Info */}
                                                            <div className="flex-1">
                                                                <div className="font-semibold">{entry.name}</div>
                                                                <div className="text-sm text-muted-foreground">{entry.school_id}</div>
                                                            </div>

                                                            {/* Stats */}
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-2 font-bold text-md">
                                                                    {entry.total_hours_formatted}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Not enough data for this month
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* All-Time Performance Bar Chart */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-6 w-6 text-blue-500" />
                                <CardTitle className="text-2xl">All-Time Performance</CardTitle>
                            </div>
                            <CardDescription>Total hours rendered by all students</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {allTimeData.length > 0 ? (
                                <div className="w-full overflow-x-auto pb-4">
                                    <div style={{ minWidth: `${Math.max(allTimeData.length * 80, 1000)}px`, height: '60vh' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={allTimeData}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={100}
                                                    interval={0}
                                                    tick={{ fontSize: 11 }}
                                                />
                                                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload as LeaderboardEntry;
                                                            return (
                                                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="text-2xl font-bold text-muted-foreground">
                                                                            #{data.rank}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold">{data.name}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm mt-2">
                                                                        <strong className="text-lg">{data.total_hours_formatted}</strong>
                                                                    </p>
                                                                    {data.job_name && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            📋 {data.job_name}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="total_hours" radius={[8, 8, 0, 0]}>
                                                    {allTimeData.map((_entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index < 3
                                                                ? index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : '#d97706'
                                                                : chartColors[index % chartColors.length]
                                                            }
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No performance data available</div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )
            }
        </div >
    );
}
