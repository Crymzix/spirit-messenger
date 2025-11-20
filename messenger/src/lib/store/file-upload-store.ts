import { create } from 'zustand';
import { listen, emit } from '@tauri-apps/api/event';

// Event payload types for Tauri communication
export interface FileTransferInitiatedPayload {
  transferId: string;
  conversationId: string;
  receiverId: string | null;
  filename: string;
  fileSize: number;
  mimeType: string;
  // File data as base64 or array buffer for cross-window transfer
  fileData: number[];
}

export interface FileUploadProgressPayload {
  transferId: string;
  progress: number;
}

export interface FileUploadCompletePayload {
  transferId: string;
  success: boolean;
  error?: string;
}

export interface FileUploadStartPayload {
  transferId: string;
}

export type FileUploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface PendingUpload {
  transferId: string;
  conversationId: string;
  receiverId: string | null;
  filename: string;
  fileSize: number;
  mimeType: string;
  file: File;
  progress: number;
  status: FileUploadStatus;
  error?: string;
}

interface FileUploadState {
  uploads: Map<string, PendingUpload>;
  initialized: boolean;

  // Actions
  addUpload: (upload: Omit<PendingUpload, 'progress' | 'status'>) => void;
  updateProgress: (transferId: string, progress: number) => void;
  updateStatus: (transferId: string, status: FileUploadStatus, error?: string) => void;
  removeUpload: (transferId: string) => void;
  getUpload: (transferId: string) => PendingUpload | undefined;
  getAllUploads: () => PendingUpload[];

  // Initialize event listeners (for main window)
  initializeMainWindow: () => Promise<() => void>;

  // Emit events (for chat windows)
  emitFileTransferInitiated: (payload: FileTransferInitiatedPayload) => Promise<void>;
  emitFileUploadStart: (transferId: string) => Promise<void>;
}

export const useFileUploadStore = create<FileUploadState>((set, get) => ({
  uploads: new Map(),
  initialized: false,

  addUpload: (upload) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.set(upload.transferId, {
        ...upload,
        progress: 0,
        status: 'pending',
      });
      return { uploads: newUploads };
    });
  },

  updateProgress: (transferId, progress) => {
    set((state) => {
      const upload = state.uploads.get(transferId);
      if (!upload) return state;

      const newUploads = new Map(state.uploads);
      newUploads.set(transferId, { ...upload, progress });
      return { uploads: newUploads };
    });
  },

  updateStatus: (transferId, status, error) => {
    set((state) => {
      const upload = state.uploads.get(transferId);
      if (!upload) return state;

      const newUploads = new Map(state.uploads);
      newUploads.set(transferId, { ...upload, status, error });
      return { uploads: newUploads };
    });
  },

  removeUpload: (transferId) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.delete(transferId);
      return { uploads: newUploads };
    });
  },

  getUpload: (transferId) => {
    return get().uploads.get(transferId);
  },

  getAllUploads: () => {
    return Array.from(get().uploads.values());
  },

  initializeMainWindow: async () => {
    if (get().initialized) {
      return () => { };
    }

    const unlisteners: Array<() => void> = [];

    // Listen for file transfer initiation from chat windows
    const unlistenInitiated = await listen<FileTransferInitiatedPayload>(
      'file-transfer-initiated',
      async (event) => {
        const payload = event.payload;

        // Convert array buffer back to File
        const uint8Array = new Uint8Array(payload.fileData);
        const blob = new Blob([uint8Array], { type: payload.mimeType });
        const file = new File([blob], payload.filename, { type: payload.mimeType });

        get().addUpload({
          transferId: payload.transferId,
          conversationId: payload.conversationId,
          receiverId: payload.receiverId,
          filename: payload.filename,
          fileSize: payload.fileSize,
          mimeType: payload.mimeType,
          file,
        });

        console.log('Main window received file transfer:', payload.filename);
      }
    );
    unlisteners.push(unlistenInitiated);

    // Listen for upload start requests (when transfer is accepted)
    const unlistenStart = await listen<FileUploadStartPayload>(
      'file-upload-start',
      async (event) => {
        const { transferId } = event.payload;
        const upload = get().getUpload(transferId);

        if (!upload) {
          console.error('Upload not found for transfer:', transferId);
          return;
        }

        // Import file service dynamically to avoid circular dependencies
        const { uploadFile } = await import('../services/file-service');

        get().updateStatus(transferId, 'uploading');

        try {
          await uploadFile({ transferId, file: upload.file }, (progress) => {
            get().updateProgress(transferId, progress);
            // Emit progress to chat windows
            emit('file-upload-progress', {
              transferId,
              progress,
            } as FileUploadProgressPayload);
          });

          get().updateStatus(transferId, 'completed');
          emit('file-upload-complete', {
            transferId,
            success: true,
          } as FileUploadCompletePayload);

          // Clean up after a delay
          setTimeout(() => {
            get().removeUpload(transferId);
          }, 5000);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          get().updateStatus(transferId, 'failed', errorMessage);
          emit('file-upload-complete', {
            transferId,
            success: false,
            error: errorMessage,
          } as FileUploadCompletePayload);
        }
      }
    );
    unlisteners.push(unlistenStart);

    set({ initialized: true });

    // Return cleanup function
    return () => {
      unlisteners.forEach((unlisten) => unlisten());
      set({ initialized: false });
    };
  },

  emitFileTransferInitiated: async (payload) => {
    await emit('file-transfer-initiated', payload);
  },

  emitFileUploadStart: async (transferId) => {
    await emit('file-upload-start', { transferId } as FileUploadStartPayload);
  },
}));

// Helper function to convert File to array buffer for Tauri event transfer
export async function fileToArrayBuffer(file: File): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}
