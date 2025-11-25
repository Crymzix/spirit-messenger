import { useEffect, useState } from "react";
import { TitleBar } from "../title-bar";
import { useUser } from "@/lib";
import { useUpdateProfile } from "@/lib/hooks/profile-hooks";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { GeneralSettings } from "../general-settings";
import { SoundsSettings } from "../sounds-settings";
import { FilesSettings } from "../files-settings";

const OPTIONS = [
    {
        label: "General",
        key: "general"
    },
    {
        label: "Profile",
        key: "profile"
    },
    {
        label: "Privacy",
        key: "privacy"
    },
    {
        label: "Sounds",
        key: "sounds"
    },
    {
        label: "Files",
        key: "files"
    }
]

export function OptionsWindow() {
    const params = new URLSearchParams(window.location.search);
    const option = params.get('option')

    const user = useUser();
    const updateProfileMutation = useUpdateProfile();
    const resetSettings = useSettingsStore((state) => state.resetSettings);

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [personalMessage, setPersonalMessage] = useState(user?.personalMessage || '');
    const [error, setError] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    const [selectedOption, setSelectedOption] = useState(OPTIONS[0]);

    useEffect(() => {
        if (user) {
            setDisplayName(user?.displayName || '')
            setPersonalMessage(user?.personalMessage || '')
        }
    }, [user])

    useEffect(() => {
        const selectedOption = OPTIONS.find(opt => opt.key === option)
        if (selectedOption) {
            setSelectedOption(selectedOption)
        }
    }, [option])

    const handleSave = async () => {
        setError(null);

        try {
            await updateProfileMutation.mutateAsync({
                displayName: displayName.trim() || user?.username || '',
                personalMessage: personalMessage.trim(),
            });

            const appWindow = getCurrentWindow();
            await appWindow.close();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        }
    };

    const handleClose = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const appWindow = getCurrentWindow();
        await appWindow.close();
    };

    const handleResetDefaults = async () => {
        if (!confirm('Are you sure you want to reset all settings to their default values?')) {
            return;
        }

        setIsResetting(true);
        try {
            await resetSettings();
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset settings');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="Options" />
            <div className="window-body flex-1 !my-[0px] !mx-[3px] flex flex-col p-2">
                <div className="flex gap-2">
                    <div className="h-[480px] w-[110px] overflow-y-auto border border-gray-400 bg-white p-[1px]">
                        {
                            OPTIONS.map(option => {
                                return (
                                    <div
                                        key={option.key}
                                        className={`py-2 px-2 ${option.key === selectedOption.key ? "bg-[#285CC1] text-white" : ""}`}
                                        onClick={() => setSelectedOption(option)}
                                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                    >
                                        {option.label}
                                    </div>
                                )
                            })
                        }
                    </div>
                    <fieldset className="!bg-[#ece9d8] flex-1">
                        <legend className="!font-bold" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>{selectedOption.label}</legend>

                        {/* General Settings */}
                        {selectedOption.key === "general" && <GeneralSettings />}

                        {/* Privacy Settings */}
                        {selectedOption.key === "privacy" && (
                            <div className="px-6 flex flex-col gap-4">
                                <div className="flex items-center whitespace-nowrap gap-1">
                                    <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                                        Privacy Settings
                                    </div>
                                    <div className="w-full h-[1px] bg-gray-400" />
                                </div>

                                <div className="ml-6 text-sm">
                                    <p className="mb-4">Control who can see your online status and contact you.</p>
                                    <p className="text-gray-600">Privacy settings will be available in a future update.</p>
                                </div>
                            </div>
                        )}

                        {/* Sound Settings */}
                        {selectedOption.key === "sounds" && <SoundsSettings />}

                        {/* Files Settings */}
                        {selectedOption.key === "files" && <FilesSettings />}

                        {/* Profile Settings */}
                        {selectedOption.key === "profile" && (
                            <div className="px-6 flex flex-col gap-2">
                                <div className="flex items-center whitespace-nowrap gap-1">
                                    <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                                        Display Name
                                    </div>
                                    <div className="w-full h-[1px] bg-gray-400" />
                                </div>
                                <div className="field-row-stacked w-full ml-6">
                                    <label>Type your name as you want others to see it:</label>
                                    <input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        maxLength={50}
                                        type="text"
                                        placeholder="Enter your display name"
                                    />
                                </div>
                                <div className="field-row-stacked w-full ml-6">
                                    <label>Type your personal message for your contacts to see:</label>
                                    <input
                                        value={personalMessage}
                                        onChange={(e) => setPersonalMessage(e.target.value)}
                                        maxLength={150}
                                        type="text"
                                        placeholder="What's on your mind?"
                                    />
                                </div>
                            </div>
                        )}
                    </fieldset>
                </div>
                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mt-2">
                        {error}
                    </div>
                )}
                <div className="flex items-center gap-4 w-full p-2 mt-auto">
                    <button
                        onClick={handleResetDefaults}
                        disabled={updateProfileMutation.isPending || isResetting}
                        className="mr-auto"
                    >
                        {isResetting ? 'Resetting...' : 'Reset Defaults'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending || isResetting}
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'OK'}
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={updateProfileMutation.isPending || isResetting}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}