import { useNotificationSettings, useSettingsActions } from "@/lib";
import { soundService } from "@/lib/services/sound-service";

/**
 * Sounds Settings Component
 * Handles notification sound preferences and volume control
 * Requirements: 14.2, 17.1, 16.3
 */
export function SoundsSettings() {
    const notificationSettings = useNotificationSettings();
    const { updateNotificationSettings } = useSettingsActions();

    const handleSoundEnabledChange = (enabled: boolean) => {
        updateNotificationSettings({ soundEnabled: enabled });
    };

    const handleVolumeChange = (volume: number) => {
        updateNotificationSettings({ soundVolume: volume });
    };

    const handleDesktopAlertsChange = (enabled: boolean) => {
        updateNotificationSettings({ desktopAlerts: enabled });
    };

    const handlePreviewSound = async (soundType: 'message' | 'contact_online' | 'contact_offline' | 'nudge') => {
        try {
            await soundService.previewSound(soundType);
        } catch (error) {
            console.error('Failed to preview sound:', error);
        }
    };

    return (
        <div className="px-6 flex flex-col gap-4">
            {/* Sound Settings Section */}
            <div className="flex items-center whitespace-nowrap gap-1">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                    Sound Settings
                </div>
                <div className="w-full h-[1px] bg-gray-400" />
            </div>

            <div className="field-row ml-6">
                <input
                    type="checkbox"
                    id="soundEnabled"
                    checked={notificationSettings.soundEnabled}
                    onChange={(e) => handleSoundEnabledChange(e.target.checked)}
                />
                <label htmlFor="soundEnabled">Enable notification sounds</label>
            </div>

            <div className="field-row-stacked w-full ml-6">
                <label htmlFor="soundVolume">
                    Sound Volume: {notificationSettings.soundVolume}%
                </label>
                <input
                    id="soundVolume"
                    type="range"
                    min="0"
                    max="100"
                    value={notificationSettings.soundVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    disabled={!notificationSettings.soundEnabled}
                />
            </div>

            <div className="field-row ml-6">
                <input
                    type="checkbox"
                    id="desktopAlerts"
                    checked={notificationSettings.desktopAlerts}
                    onChange={(e) => handleDesktopAlertsChange(e.target.checked)}
                />
                <label htmlFor="desktopAlerts">Show desktop notifications</label>
            </div>

            {/* Sound Preview Section */}
            <div className="flex items-center whitespace-nowrap gap-1 mt-4">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                    Preview Sounds
                </div>
                <div className="w-full h-[1px] bg-gray-400" />
            </div>

            <div className="ml-6 flex flex-col gap-2">
                <div
                    onClick={() => {
                        if (!notificationSettings.soundEnabled) {
                            return
                        }
                        handlePreviewSound('message')
                    }}
                    className={`flex items-center gap-2 ${!notificationSettings.soundEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    <img src='/sound.png' className="size-10" />
                    Preview message sound
                </div>
                <div
                    onClick={() => {
                        if (!notificationSettings.soundEnabled) {
                            return
                        }
                        handlePreviewSound('contact_online')
                    }}
                    className={`flex items-center gap-2 ${!notificationSettings.soundEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    <img src='/sound.png' className="size-10" />
                    Preview sign in sound
                </div>
                <div
                    onClick={() => {
                        if (!notificationSettings.soundEnabled) {
                            return
                        }
                        handlePreviewSound('contact_offline')
                    }}
                    className={`flex items-center gap-2 ${!notificationSettings.soundEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    <img src='/sound.png' className="size-10" />
                    Preview sign out sound
                </div>
                <div
                    onClick={() => {
                        if (!notificationSettings.soundEnabled) {
                            return
                        }
                        handlePreviewSound('nudge')
                    }}
                    className={`flex items-center gap-2 ${!notificationSettings.soundEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    <img src='/sound.png' className="size-10" />
                    Preview nudge sound
                </div>
            </div>
        </div >
    );
}
