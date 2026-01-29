/**
 * Compresses and resizes an image file to a specified maximum dimension.
 * Returns a DataURL (Base64) of the compressed image.
 */
export const compressImage = (
    file: File,
    maxSize: number = 200,
    quality: number = 0.7
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate aspect ratio and new dimensions
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Smooth resizing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Export as compressed JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
            img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Generates a valid URL for an avatar.
 * Handles:
 * 1. Full URLs (http/https) -> returns as is
 * 2. Relative paths -> prepends Supabase Storage URL
 * 3. Empty/Null -> returns null (for initials fallback)
 */
export const getAvatarUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;

    // If it's already a full URL or blob (local preview), return it
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
        return path;
    }

    // If it's a relative path, prepend Supabase Storage URL
    // We assume the bucket is 'avatars' based on common patterns, 
    // or 'profile-photos' if that's what the project uses. 
    // Ideally this should be configurable, but for now we look for the pattern.

    // Hardcoded project URL from lib/supabase.ts for consistency
    const SUPABASE_PROJECT_URL = 'https://cabdbnfjpsxbdmriabct.supabase.co';

    // Check if path already contains the bucket info or is just a filename
    if (path.includes('/storage/v1/object/public/')) {
        return `${SUPABASE_PROJECT_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    // Fallback: assume it's a filename in 'avatars' bucket
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/avatars/${path}`;
};
