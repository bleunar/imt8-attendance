/**
 * Dashboard Layout
 * 
 * Main layout for authenticated users with sidebar navigation and header.
 */

import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
const LayoutDashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

const BarChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-muted-foreground animate-pulse">Loading...</div>
            </div>
        );
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const canManage = isAdmin || isManager;

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon, show: true },
        { name: 'Accounts', href: '/dashboard/accounts', icon: UsersIcon, show: canManage },
        { name: 'Jobs', href: '/dashboard/jobs', icon: BriefcaseIcon, show: canManage },
        { name: 'Performance', href: '/dashboard/performance', icon: BarChartIcon, show: canManage },
        // { name: 'Schedule', href: '/dashboard/schedule', icon: CalendarIcon, show: true }, // HIDDEN DUE TO ISSUES
        { name: 'Attendance', href: '/dashboard/attendance', icon: ClipboardListIcon, show: canManage },
        { name: 'My Profile', href: '/dashboard/profile', icon: UserIcon, show: true },
    ];

    const getInitials = (firstName: string | null, lastName: string | null) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar/95 backdrop-blur-xl fixed inset-y-0 z-50">
                <div className="p-6">
                    <Link to="/dashboard" className="flex items-center justify-center gap-2">
                        <span className="font-bold text-xl tracking-tight">ITSD<span className="text-primary">Attendance</span></span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => (
                        item.show && (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.href
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                            >
                                <item.icon />
                                {item.name}
                            </Link>
                        )
                    ))}
                </nav>

                <div className="p-2">
                    <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                    >
                        <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                {getInitials(user?.first_name || null, user?.last_name || null)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {user?.first_name} {user?.last_name}
                            </p>
                            {(user?.course || user?.department) && (
                                <p className="text-xs text-muted-foreground truncate mb-0">
                                    {user?.course || user?.department}
                                    {user?.year_level ? (() => {
                                        const year = Math.floor(user.year_level);
                                        const sem = Math.round((user.year_level % 1) * 10);
                                        return ` ${year} Sem ${sem}`;
                                    })() : ''}
                                </p>
                            )}
                        </div>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Header - Mobile & Desktop */}
                <header className="h-16 bg-background/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 border-b">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <MenuIcon />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" className='p-0 m-0 bg-transparent hover:bg-transparent shadow-none border-none'>
                                    <div className="flex flex-col justify-center items-end mr-1">
                                        <p className="text-sm font-medium text-foreground truncate mb-0">
                                            {user?.first_name} {user?.last_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate capitalize">
                                            {user?.role}
                                        </p>
                                    </div>
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            {getInitials(user?.first_name || null, user?.last_name || null)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user?.department}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/dashboard/profile">Profile Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4">
                        <div className="flex justify-between items-center mb-8">
                            <span className="font-bold text-xl">Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        </div>
                        <nav className="space-y-2">
                            {navigation.map((item) => (
                                item.show && (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium ${location.pathname === item.href
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            }`}
                                    >
                                        <item.icon />
                                        {item.name}
                                    </Link>
                                )
                            ))}
                        </nav>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 'w-screen' overflow-x-scroll">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
