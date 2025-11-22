import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";
import { platform } from "@tauri-apps/plugin-os";

export function NotificationWindow() {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message') || 'Unknown';
    const description = params.get('description') || ''
    const senderId = params.get('senderId')

    useEffect(() => {
        // Position window based on platform
        // macOS: top right (like native notifications)
        // Windows/Linux: bottom right
        const positionWindow = async () => {
            try {
                const os = platform();
                const position = os === 'macos' ? Position.TopRight : Position.BottomRight;
                await moveWindow(position);
            } catch (error) {
                console.error('Failed to position notification window:', error);
            }
        };
        positionWindow();

        // Auto-close after 5 seconds
        const timeout = setTimeout(() => {
            const appWindow = getCurrentWindow();
            appWindow.close();
        }, 5000);

        return () => clearTimeout(timeout);
    }, []);

    const handleClick = async () => {
        const appWindow = getCurrentWindow();
        // Emit event to open chat window with this sender
        if (senderId) {
            await appWindow.emit('chat-notification-clicked', { senderId });
        }
        appWindow.close();
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        const appWindow = getCurrentWindow();
        appWindow.close();
    };

    return (
        <div
            className="w-screen h-screen flex flex-col cursor-pointer"
            style={{
                background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
            }}
            onClick={handleClick}
        >
            <div className="flex flex-col flex-1 z-40 h-full">
                <div
                    style={{
                        background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                    }}
                    className="flex justify-between w-full z-10 py-1 px-0.5">
                    <div className="flex items-center gap-1">
                        <img src='/msn.png' className="size-6" />
                        <div
                            className="text-[#31497C] !text-sm"
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            MSN Messenger
                        </div>
                    </div>
                    <div
                        onClick={handleClose}
                        className="size-6 text-sm text-center font-bold text-white px-1 rounded bg-[#bf3128] border border-white flex items-center justify-center"
                        title="Close"
                    >
                        ×
                    </div>
                </div>
                <div className="flex flex-col flex-1 min-w-0 z-20 border-[0.5px] border-[#9A9FD0] m-0.5 px-0.5 overflow-hidden">
                    <div className="flex flex-col gap-1 py-2 px-2">
                        <div className="text-md text-[#31497C] max-w-[300px] line-clamp-1">{message}</div>
                        <div className="text-md text-[#31497C] max-w-[300px] line-clamp-2 break-all">{description}</div>
                    </div>
                    <img src="/spirit-logo.png" alt="" className="ml-auto mt-auto h-6" />
                </div>
            </div>
        </div>
    );
}
