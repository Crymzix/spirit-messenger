import { TitleBar } from "../title-bar";
import { useSendContactRequest } from "@/lib/hooks/contact-hooks";
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function AddContactWindow() {
    const [email, setEmail] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const sendContactMutation = useSendContactRequest();

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);

        // Validate email format
        if (!email.trim()) {
            return;
        }

        if (!validateEmail(email)) {
            return;
        }

        try {
            await sendContactMutation.mutateAsync(email.trim());

            setSuccessMessage('Contact request sent successfully!');
            setEmail('');

            // Close dialog after a short delay
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            // Error is already tracked by react-query
            console.error('Failed to send contact request:', err);
        }
    };

    const handleClose = () => {
        const appWindow = getCurrentWindow();
        appWindow.close()
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="Add a Contact" />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px] flex">
                {/* Dialog Content */}
                <div className="p-4 flex flex-col gap-6 h-full flex-1">
                    <img src="/spirit-banner.png" className="h-22 ml-auto" />
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                        <div className="mb-4 flex flex-col gap-4">
                            <label htmlFor="contact-email" className="block text-[11px] font-bold text-black mb-2">
                                Please type your contact's complete e-mail address
                            </label>
                            <input
                                id="contact-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                className="w-full px-3 py-2 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue"
                                disabled={sendContactMutation.isPending}
                                autoFocus
                            />
                            <div className="flex items-center justify-center w-full">
                                <div className="flex gap-4">
                                    <label className="self-start">
                                        Example:
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <label>name_123@hotmail.com</label>
                                        <label>myname@msn.com</label>
                                        <label>example@passport.com</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {sendContactMutation.error && (
                            <div className="mb-4 p-2 bg-red-50 border border-red-300 rounded">
                                <p className="text-sm text-red-700">{sendContactMutation.error.message}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mb-4 p-2 bg-green-50 border border-green-300 rounded">
                                <p className="text-sm text-green-700">{successMessage}</p>
                            </div>
                        )}

                        {/* Dialog Actions */}
                        <div className="flex justify-end gap-2 mt-auto">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={sendContactMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sendContactMutation.isPending}
                            >
                                {sendContactMutation.isPending ? 'Loading...' : 'Add'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}