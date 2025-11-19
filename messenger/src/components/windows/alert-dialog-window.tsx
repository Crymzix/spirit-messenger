import { TitleBar } from "../title-bar";
import { getCurrentWindow } from "@tauri-apps/api/window";


export function AlertDialogWindow() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title') || 'Alert';
    const description = params.get('description')
    const eventName = params.get('event') || 'event'

    const handleConfirm = async () => {
        const appWindow = getCurrentWindow();
        await appWindow.emit(eventName);
        appWindow.close()
    };

    const handleClose = () => {
        const appWindow = getCurrentWindow();
        appWindow.close()
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title={title} />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
                {/* Content */}
                <div className="p-4 flex flex-col gap-4">
                    {description}
                    {/* Buttons */}
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={handleConfirm}
                        >
                            OK
                        </button>
                        <button
                            onClick={handleClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
