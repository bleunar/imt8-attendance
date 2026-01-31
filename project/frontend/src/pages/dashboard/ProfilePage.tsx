/**
 * Profile Page
 * 
 * Displays the current user's profile using the UserProfile component in profile mode.
 */

import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/UserProfile';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="py-6">
            <UserProfile
                mode="profile"
                user={user}
                onUpdate={refreshUser}
            />
        </div>
    );
}
