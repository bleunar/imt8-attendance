/**
 * ProfilePicture Component
 * 
 * Reusable component for displaying user profile pictures with 3 states:
 * - Loading: Skeleton animation while image loads
 * - Placeholder: Shows initials when no picture exists
 * - Profile: Displays the loaded profile picture
 */

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfilePictureProps {
    /** URL to the profile picture (null if none) */
    src: string | null | undefined;
    /** User's first name for initials fallback */
    firstName?: string | null;
    /** User's last name for initials fallback */
    lastName?: string | null;
    /** Predefined size variants */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Shape of the profile picture */
    shape?: 'circle' | 'square';
    /** Additional CSS classes */
    className?: string;
}

const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
};

/**
 * Get initials from first and last name
 */
function getInitials(firstName?: string | null, lastName?: string | null): string {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
}

export function ProfilePicture({
    src,
    firstName,
    lastName,
    size = 'md',
    shape = 'circle',
    className,
}: ProfilePictureProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset states when src changes
    useEffect(() => {
        if (src) {
            setIsLoading(true);
            setHasError(false);
        } else {
            setIsLoading(false);
            setHasError(false);
        }
    }, [src]);

    const initials = getInitials(firstName, lastName);
    const sizeClass = sizeClasses[size];
    const shapeClass = shape === 'square' ? 'rounded-md' : 'rounded-full';

    // If no src provided, show initials immediately (no image to load)
    if (!src) {
        return (
            <Avatar className={cn(sizeClass, shapeClass, 'border border-border', className)}>
                <AvatarFallback className={cn("bg-muted text-muted-foreground font-medium", shapeClass)}>
                    {initials}
                </AvatarFallback>
            </Avatar>
        );
    }

    return (
        <Avatar className={cn(sizeClass, shapeClass, 'border border-border', className)}>
            {!hasError && (
                <AvatarImage
                    src={src}
                    alt={`${firstName || ''} ${lastName || ''}`.trim() || 'Profile'}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    className={cn(
                        'object-cover',
                        shapeClass,
                        isLoading && 'opacity-0'
                    )}
                />
            )}
            <AvatarFallback
                className={cn(
                    'bg-muted text-muted-foreground font-medium',
                    shapeClass,
                    isLoading && 'animate-pulse bg-muted/80'
                )}
            >
                {isLoading ? '' : initials}
            </AvatarFallback>
        </Avatar>
    );
}

export default ProfilePicture;
