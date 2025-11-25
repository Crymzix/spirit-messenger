import { useFileSettings, useSettingsActions } from "@/lib";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import { useState, useEffect } from "react";

/**
 * Files Settings Component
 * Handles file transfer preferences including download location
 * Requirements: 14.4, 17.1, 16.3
 */
export function FilesSettings() {
    const fileSettings = useFileSettings();
    const { updateFileSettings } = useSettingsActions();
    const [displayPath, setDisplayPath] = useState<string>('');

    // Initialize display path
    useEffect(() => {
        const initPath = async () => {
            if (fileSettings.downloadLocation) {
                setDisplayPath(fileSettings.downloadLocation);
            } else {
                // Get default downloads folder
                try {
                    const home = await homeDir();
                    const defaultPath = `${home}Downloads`;
                    setDisplayPath(defaultPath);
                } catch (error) {
                    console.error('Failed to get home directory:', error);
                    setDisplayPath('Default Downloads folder');
                }
            }
        };

        initPath();
    }, [fileSettings.downloadLocation]);

    const handleBrowse = async () => {
        try {
            // Open folder selection dialog
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Download Location',
            });

            if (selected && typeof selected === 'string') {
                updateFileSettings({ downloadLocation: selected });
                setDisplayPath(selected);
            }
        } catch (error) {
            console.error('Failed to open folder dialog:', error);
        }
    };

    const handleOpenFolder = async () => {
        try {
            const pathToOpen = fileSettings.downloadLocation || displayPath;
            if (pathToOpen && pathToOpen !== 'Default Downloads folder') {
                // Use Tauri's opener plugin to open the folder
                const { openPath } = await import('@tauri-apps/plugin-opener');
                await openPath(pathToOpen);
            }
        } catch (error) {
            console.error('Failed to open folder:', error);
        }
    };

    return (
        <div className="px-6 flex flex-col gap-4">
            {/* File Transfer Settings Section */}
            <div className="flex items-center whitespace-nowrap gap-1">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                    File Transfer Settings
                </div>
                <div className="w-full h-[1px] bg-gray-400" />
            </div>

            <div className="field-row-stacked w-full ml-6">
                <label htmlFor="downloadLocation">
                    Default download location:
                </label>
                <div className="flex gap-2 items-center">
                    <input
                        id="downloadLocation"
                        type="text"
                        value={displayPath}
                        readOnly
                        className="flex-1"
                    />
                    <button onClick={handleBrowse} className="!mt-0">
                        Browse...
                    </button>
                </div>
            </div>

            <div className="ml-6 flex gap-2">
                <button
                    onClick={handleOpenFolder}
                    disabled={!displayPath || displayPath === 'Default Downloads folder'}
                    className="w-[150px]"
                >
                    Open Folder
                </button>
            </div>

            <div className="ml-6 text-sm mt-2">
                <p className="text-gray-600">
                    Files will be saved to your selected location. If no location is specified,
                    files will be saved to your default Downloads folder.
                </p>
            </div>
        </div>
    );
}
