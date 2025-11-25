import { useNotificationSettings, useSettingsActions, useStartupSettings } from "@/lib";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

/**
 * General Settings Component
 * Handles startup options and notification preferences
 * Requirements: 14.3, 17.1, 16.3
 */
export function GeneralSettings() {
    const notificationSettings = useNotificationSettings();
    const startupSettings = useStartupSettings();
    const { updateNotificationSettings, updateStartupSettings } = useSettingsActions();

    // Sync auto-launch setting with Tauri when it changes
    useEffect(() => {
        const syncAutoLaunch = async () => {
            try {
                await invoke('set_auto_launch', { enabled: startupSettings.autoLaunch });
            } catch (error) {
                console.error('Failed to set auto-launch:', error);
            }
        };

        syncAutoLaunch();
    }, [startupSettings.autoLaunch]);

    const handleAutoLaunchChange = (enabled: boolean) => {
        updateStartupSettings({ autoLaunch: enabled });
    };

    const handleStartMinimizedChange = (enabled: boolean) => {
        updateStartupSettings({ startMinimized: enabled });
    };

    const handleNotificationsEnabledChange = (enabled: boolean) => {
        updateNotificationSettings({ enabled });
    };

    return (
        <div className="px-6 flex flex-col gap-4">
            {/* Startup Options Section */}
            <div className="flex items-center whitespace-nowrap gap-1">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                    Startup Options
                </div>
                <div className="w-full h-[1px] bg-gray-400" />
            </div>

            <div className="field-row ml-6">
                <input
                    type="checkbox"
                    id="autoLaunch"
                    checked={startupSettings.autoLaunch}
                    onChange={(e) => handleAutoLaunchChange(e.target.checked)}
                />
                <label htmlFor="autoLaunch">Run Spirit Messenger when the computer starts</label>
            </div>

            <div className="field-row ml-6">
                <input
                    type="checkbox"
                    id="startMinimized"
                    checked={startupSettings.startMinimized}
                    onChange={(e) => handleStartMinimizedChange(e.target.checked)}
                />
                <label htmlFor="startMinimized">Start minimized to system tray</label>
            </div>

            {/* Notifications Section */}
            <div className="flex items-center whitespace-nowrap gap-1 mt-4">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                    Notifications
                </div>
                <div className="w-full h-[1px] bg-gray-400" />
            </div>

            <div className="field-row ml-6">
                <input
                    type="checkbox"
                    id="notificationsEnabled"
                    checked={notificationSettings.enabled}
                    onChange={(e) => handleNotificationsEnabledChange(e.target.checked)}
                />
                <label htmlFor="notificationsEnabled">Enable all notifications</label>
            </div>
        </div>
    );
}
