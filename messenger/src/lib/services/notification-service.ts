import { invoke } from '@tauri-apps/api/core';

/**
 * Service for displaying system notifications
 */
export class NotificationService {
    private permissionRequested = false;

    /**
     * Request notification permission from the OS
     */
    async requestPermission(): Promise<void> {
        try {
            const result = await invoke<string>('request_notification_permission');
            console.log('Notification permission result:', result);
            this.permissionRequested = true;
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            throw error;
        }
    }

    /**
     * Show a system notification with title and body
     * @param title - The notification title
     * @param body - The notification body text
     */
    async show(title: string, body: string): Promise<void> {
        try {
            // Request permission on first use if not already requested
            if (!this.permissionRequested) {
                await this.requestPermission();
            }

            await invoke('show_notification', { title, body });
        } catch (error) {
            console.error('Failed to show notification:', error);
            throw error;
        }
    }

    /**
     * Show a notification for a new message
     * @param senderName - Name of the message sender
     * @param messagePreview - Preview of the message content
     */
    async showMessageNotification(senderName: string, messagePreview: string): Promise<void> {
        await this.show(`New message from ${senderName}`, messagePreview);
    }

    /**
     * Show a notification for a contact coming online
     * @param contactName - Name of the contact
     */
    async showContactOnlineNotification(contactName: string): Promise<void> {
        await this.show('Contact Online', `${contactName} is now online`);
    }

    /**
     * Show a notification for a contact going offline
     * @param contactName - Name of the contact
     */
    async showContactOfflineNotification(contactName: string): Promise<void> {
        await this.show('Contact Offline', `${contactName} is now offline`);
    }

    /**
     * Show a notification for a contact request
     * @param contactName - Name of the contact requesting
     */
    async showContactRequestNotification(contactName: string): Promise<void> {
        await this.show('Contact Request', `${contactName} wants to add you as a contact`);
    }

    /**
     * Show a notification for a file transfer
     * @param senderName - Name of the file sender
     * @param filename - Name of the file
     */
    async showFileTransferNotification(senderName: string, filename: string): Promise<void> {
        await this.show('File Transfer', `${senderName} is sending you ${filename}`);
    }
};

// Export singleton instance
export const notificationService = new NotificationService();