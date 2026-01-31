/**
 * Login Page for Core Attendance application
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { PasswordRecoveryDialog } from '@/components/auth/PasswordRecoveryDialog';
import logo from '@/assets/img/logo/logo.png';
import { Eye, EyeOff } from 'lucide-react';


export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();

    // Redirect if already authenticated
    if (isAuthenticated && !isAuthLoading) {
        navigate('/dashboard');
    }

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login({ identifier, password });
            navigate('/dashboard');
        } catch (err: unknown) {
            const errorMessage = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                || 'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10 w-full">

            <div className="relative w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center mb-8 animate-in fade-in duration-500">
                    <img src={logo} alt="ITSD Logo" className="w-32 h-32 object-contain hidden" />
                    <h1 className="text-4xl font-bold text-white text tracking-tight">ITSD<span className="text-blue-600">Attendance</span></h1>
                    <div className="text-slate-400 text-sm mt-2">
                        <b>Sign in</b> to access the dashboard
                    </div>
                </div>


                <Card className="bg-slate-700/80 border-none shadow-xl backdrop-blur-sm animate-in fade-in duration-700">
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-slate-300">
                                    Email or School ID
                                </Label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="Enter your email or school ID"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                                        disabled={isLoading}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-between pt-2">
                                <Button type='button' size="sm" variant='link' className="text-sm text-slate-500" onClick={() => navigate("/")}>
                                    Time In / Out
                                </Button>

                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Logging in...
                                        </span>
                                    ) : (
                                        'Login'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-8">

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setIsRecoveryOpen(true)}
                            className="text-sm text-muted-foreground hover:text-slate-300 transition-colors"
                        >
                            Forgot your password?
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-12 md:bottom-6 left-0 w-full px-6 z-20 animate-in fade-in duration-1200">
                <div className="flex flex-col items-end z-[500]">
                    <div className="flex items-center gap-1 text-muted/30">
                        <div className="text-xs">ITSD</div>
                        {/* <AtSign className='h-3 w-3' /> */}
                        <div className="text-xs">{new Date().getFullYear()}</div>
                    </div>
                    <div className="flex items-center gap-1 text-muted/30">
                        <div className="text-xs gap-1 flex">
                            Developed by
                            <a
                                href="https://www.youtube.com/watch?v=kRpODt0rflA"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                            >
                                Toni Ross Arabit
                            </a>
                        </div>
                    </div>
                </div>
            </div>


            <PasswordRecoveryDialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen} />
        </div>
    );
}

// Forgot Password Form Component (Removed - Refactored to PasswordRecoveryDialog)
