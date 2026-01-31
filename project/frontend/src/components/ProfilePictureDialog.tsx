/**
 * ProfilePictureDialog Component
 * 
 * A dialog for viewing, uploading, and removing profile pictures.
 * Can be opened from the navbar dropdown or profile page.
 */

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ProfilePicture } from '@/components/ProfilePicture';
import { accountService } from '@/services/accountService';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Camera } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ProfilePictureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfilePictureDialog({ open, onOpenChange }: ProfilePictureDialogProps) {
    const { user, setUser } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showUploadView, setShowUploadView] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Invalid file type. Please upload JPEG, PNG, WebP, or GIF.');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error('File is too large. Maximum size is 5MB.');
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setShowUploadView(true);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const result = await accountService.uploadProfilePicture(selectedFile, (progress) => {
                setUploadProgress(progress);
            });

            // Update auth context
            if (user) {
                setUser({ ...user, profile_picture: result.profile_picture });
            }

            toast.success('Profile picture updated successfully!');
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to upload profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePicture = async () => {
        if (!confirm('Are you sure you want to remove your profile picture?')) return;

        setIsDeleting(true);
        try {
            await accountService.removeProfilePicture();

            // Update auth context
            if (user) {
                setUser({ ...user, profile_picture: null });
            }

            toast.success('Profile picture removed');
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to remove profile picture');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after animation
        setTimeout(() => {
            setSelectedFile(null);
            setPreviewUrl(null);
            setUploadProgress(0);
            setShowUploadView(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 200);
    };

    const handleBack = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setShowUploadView(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Upload confirmation view
    if (showUploadView && previewUrl) {
        return (
            <Dialog open={open} onOpenChange={(o) => !isUploading && !o && handleClose()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Upload</DialogTitle>
                        <DialogDescription>
                            Preview your new profile picture before uploading.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex gap-4">
                            <div>
                                <div className="small text-center">Circle</div>
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-32 h-32 rounded-full object-cover border-2 border-border"
                                />
                            </div>
                            <div>
                                <div className="small text-center">Square</div>
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-32 h-32 rounded object-cover border-2 border-border"
                                />
                            </div>

                        </div>

                        <div className="text-center space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {selectedFile?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                            </p>
                        </div>

                        {isUploading && (
                            <div className="w-full space-y-2">
                                <Progress value={uploadProgress} className="h-2" />
                                <p className="text-xs text-center text-muted-foreground">
                                    Uploading... {uploadProgress}%
                                </p>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground text-center bg-muted/50 p-3 py-2 rounded">
                            <p>Images with a square aspect ration will display your picture better</p>
                            <p className="mt-1">Supported formats: JPEG, PNG, WebP, GIF</p>
                        </div>
                        <div className="text-xs w-full bg-red-100 text-muted-foreground text-center p-3 py-2 rounded">
                            <p>NOTE: Images with explicit and NSFW content are not allowed</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleBack} disabled={isUploading}>
                            Back
                        </Button>
                        <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-1 h-4 w-4" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Main view - show current picture with options
    return (
        <Dialog open={open} onOpenChange={(o) => !isDeleting && !o && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Profile Picture</DialogTitle>
                    <DialogDescription>
                        View and manage your profile picture.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-6">
                    <div className="relative group">
                        <ProfilePicture
                            src={user?.profile_picture}
                            firstName={user?.first_name}
                            lastName={user?.last_name}
                            size="xl"
                            className="ring-2 ring-border w-32 h-32"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <Camera className="h-8 w-8 text-white" />
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {user?.profile_picture && (
                        <Button
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDeletePicture}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Remove Picture
                        </Button>
                    )}
                    <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        {user?.profile_picture ? 'Change Picture' : 'Upload Picture'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ProfilePictureDialog;
