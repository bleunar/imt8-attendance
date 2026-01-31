
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderTitleContextType {
    title: string;
    setTitle: (title: string | null) => void;
}

const HeaderTitleContext = createContext<HeaderTitleContextType | undefined>(undefined);

export function HeaderTitleProvider({ children }: { children: React.ReactNode }) {
    const [customTitle, setCustomTitle] = useState<string | null>(null);
    const location = useLocation();

    // Reset custom title on route change
    useEffect(() => {
        setCustomTitle(null);
    }, [location.pathname]);

    // Derive default title from path
    const getDefaultTitle = (pathname: string): string => {
        if (pathname === '/') return '';
        if (pathname === '/login') return 'Login';
        if (pathname === '/dashboard') return 'Dashboard';
        if (pathname === '/dashboard/accounts') return 'Account Management';
        if (pathname === '/dashboard/jobs') return 'Job Management';
        if (pathname === '/dashboard/attendance') return 'Attendance Logs';
        if (pathname === '/dashboard/performance') return 'Performance Overview';
        if (pathname === '/dashboard/profile') return 'My Profile';
        return 'ITSD Attendance';
    };

    const title = customTitle || getDefaultTitle(location.pathname);

    // Sync document title
    useEffect(() => {
        document.title = `${title ? `${title} • ` : ""}ITSD Attendance`;
    }, [title]);

    return (
        <HeaderTitleContext.Provider value={{ title, setTitle: setCustomTitle }}>
            {children}
        </HeaderTitleContext.Provider>
    );
}

export function useHeaderTitle() {
    const context = useContext(HeaderTitleContext);
    if (!context) {
        throw new Error('useHeaderTitle must be used within a HeaderTitleProvider');
    }
    return context;
}
