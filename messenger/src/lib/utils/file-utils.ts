/**
 * File Utilities
 * Helper functions for file validation and formatting
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Validate a file for transfer
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`,
        };
    }

    // Check if file size is 0
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty',
        };
    }

    return { valid: true };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get MIME type from file
 */
export function getMimeType(file: File): string {
    return file.type || 'application/octet-stream';
}

/**
 * Open file dialog using Tauri
 */
export async function openFileDialog(): Promise<File | null> {
    try {
        // @ts-ignore - Tauri API
        const { invoke } = window.__TAURI__.core;
        const filePath = await invoke<string | null>('open_file_dialog');

        if (!filePath) {
            return null;
        }

        // Read the file using the File System API or fetch
        // For now, we'll use a file input element as a workaround
        // In a real implementation, you'd use Tauri's file system API
        return null;
    } catch (error) {
        console.error('Failed to open file dialog:', error);
        return null;
    }
}

/**
 * Create a file input element and trigger it
 * This is a browser-based alternative to Tauri's file dialog
 */
export function createFileInput(
    onFileSelected: (file: File) => void,
    accept?: string
): void {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) {
        input.accept = accept;
    }

    input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            onFileSelected(file);
        }
    };

    input.click();
}
