/**
 * Authentication Context for Core Attendance application
 * 
 * Provides authentication state management with automatic token refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import authService from '@/services/authService';
import accountService from '@/services/accountService';
import { setAccessToken, getAccessToken } from '@/services/api';
import type { User, LoginRequest } from '@/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval (30 seconds before expiry)
const REFRESH_BUFFER_MS = 30 * 1000;

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const expiresInRef = useRef<number>(0);

    // Clear refresh timer
    const clearRefreshTimer = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
    }, []);

    // Schedule token refresh
    const scheduleRefresh = useCallback((expiresIn: number) => {
        clearRefreshTimer();
        expiresInRef.current = expiresIn;

        // Schedule refresh 30 seconds before expiry
        const refreshTime = Math.max((expiresIn * 1000) - REFRESH_BUFFER_MS, 5000);

        refreshTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await authService.refreshToken();
                scheduleRefresh(response.expires_in);
            } catch {
                // Refresh failed, logout
                setUser(null);
                setAccessToken(null);
            }
        }, refreshTime);
    }, [clearRefreshTimer]);

    // Fetch user profile
    const fetchUser = useCallback(async () => {
        try {
            const profile = await accountService.getProfile();
            setUser(profile);
        } catch {
            setUser(null);
            setAccessToken(null);
        }
    }, []);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        await fetchUser();
    }, [fetchUser]);

    // Login
    const login = useCallback(async (data: LoginRequest) => {
        const response = await authService.login(data);
        scheduleRefresh(response.expires_in);
        await fetchUser();
    }, [scheduleRefresh, fetchUser]);

    // Logout
    const logout = useCallback(async () => {
        clearRefreshTimer();
        try {
            await authService.logout();
        } finally {
            setUser(null);
            setAccessToken(null);
        }
    }, [clearRefreshTimer]);

    // Initial auth check on mount
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);
            try {
                // Try to refresh token (will fail if no valid refresh cookie)
                const response = await authService.refreshToken();
                scheduleRefresh(response.expires_in);
                await fetchUser();
            } catch {
                // Not authenticated or refresh failed
                setUser(null);
                setAccessToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Cleanup on unmount
        return () => {
            clearRefreshTimer();
        };
    }, [scheduleRefresh, fetchUser, clearRefreshTimer]);

    // Context value
    const value: AuthContextType = {
        user,
        isAuthenticated: !!user && !!getAccessToken(),
        isLoading,
        login,
        logout,
        refreshUser,
        setUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
