import { useRemoveContact } from "@/lib/hooks/contact-hooks";
import { TitleBar } from "../title-bar";
import { getCurrentWindow } from "@tauri-apps/api/window";


export function RemoveContactWindow() {
    const params = new URLSearchParams(window.location.search);
    const contactId = params.get('contactId');
    const contactName = params.get('contactName')
    const removeContactMutation = useRemoveContact();

    const confirmRemoveContact = async () => {
        if (!contactId) {
            return;
        }

        try {
            await removeContactMutation.mutateAsync(contactId)

            // Close dialog after a short delay
            setTimeout(() => {
                handleClose();
            }, 500);
        } catch (err) {
            console.error('Failed to remove contact:', err);
        }
    };

    const handleClose = () => {
        const appWindow = getCurrentWindow();
        appWindow.close()
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="Remove Contact" />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
                {/* Content */}
                <div className="p-4 flex flex-col gap-4">
                    {`Are you sure you want to remove ${contactName} from your contact list?`}
                    {/* Error Message */}
                    {removeContactMutation.error && (
                        <div className="mb-4 p-2 bg-red-50 border border-red-300 rounded">
                            <p className="text-sm text-red-700">{removeContactMutation.error.message}</p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={confirmRemoveContact}
                        >
                            {removeContactMutation.isPending ? 'Loading...' : 'OK'}
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
