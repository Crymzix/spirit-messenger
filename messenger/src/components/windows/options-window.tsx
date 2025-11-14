import { useState } from "react";
import { TitleBar } from "../title-bar";
import { useUser } from "@/lib";
import { useUpdateProfile } from "@/lib/hooks/profile-hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";

const OPTIONS = [
    {
        label: "Personal",
        key: "personal"
    }
]

export function OptionsWindow() {
    const user = useUser();
    const updateProfileMutation = useUpdateProfile();

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [personalMessage, setPersonalMessage] = useState(user?.personalMessage || '');
    const [error, setError] = useState<string | null>(null);

    const [selectedOption, setSelectedOption] = useState(OPTIONS[0]);

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
                                    >
                                        {option.label}
                                    </div>
                                )
                            })
                        }
                    </div>
                    <fieldset className="!bg-[#ece9d8] flex-1">
                        <legend className="!font-bold">{selectedOption.label}</legend>
                        <div className="px-6 flex flex-col gap-2">
                            <div className="flex items-center whitespace-nowrap gap-1">
                                <div
                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                >
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
                        onClick={handleSave}
                        className="ml-auto"
                        disabled={updateProfileMutation.isPending}
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'OK'}
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={updateProfileMutation.isPending}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}