import { useState, useEffect } from "react";
import { SignInScreen } from "../screens/sign-in-screen";
import { RegistrationScreen } from "../screens/registration-screen";
import {
    useSignIn,
    useSignUp,
} from "@/lib/hooks/auth-hooks";
import { useGlobalMessageUpdates } from "@/lib/hooks/message-hooks";
import { ContactsScreen } from "../screens/contacts-screen";
import { Loading } from "../loading";
import { useFileUploadStore } from "@/lib/store/file-upload-store";
import { useCallUpdates } from "@/lib/hooks/call-hooks";
import { PresenceStatus } from "@/types";
import { useAuthStore } from "@/lib";

type AuthView = 'signin' | 'register' | 'main';

export function MainWindow() {
    const [currentView, setCurrentView] = useState<AuthView>('signin');

    const isAuthInitialized = useAuthStore(state => state.isAuthInitialized)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const isAuthLoading = useAuthStore(state => state.isAuthLoading)

    const signInMutation = useSignIn();
    const signUpMutation = useSignUp();
    const initializeMainWindow = useFileUploadStore((state) => state.initializeMainWindow);

    // Global message listener for all conversations
    useGlobalMessageUpdates();

    // Global call broadcast listener for incoming calls
    useCallUpdates();

    useEffect(() => {
        if (isAuthInitialized && isAuthenticated) {
            setCurrentView('main');
        } else if (isAuthInitialized && !isAuthenticated) {
            setCurrentView('signin');
        }
    }, [isAuthInitialized, isAuthenticated]);

    // Initialize file upload manager for main window
    useEffect(() => {
        let cleanup: (() => void) | undefined;

        initializeMainWindow().then((cleanupFn) => {
            cleanup = cleanupFn;
        });

        return () => {
            cleanup?.();
        };
    }, [initializeMainWindow]);

    const handleSignIn = async (email: string, password: string, status: string) => {
        try {
            // Map UI status strings to backend PresenceStatus format
            const statusMap: Record<string, PresenceStatus> = {
                'Online': 'online',
                'Busy': 'busy',
                'Be Right Back': 'be_right_back',
                'Away': 'away',
                'On The Phone': 'on_the_phone',
                'Out To Lunch': 'out_to_lunch',
                'Appear Offline': 'appear_offline',
            };

            const presenceStatus = statusMap[status] || 'online';

            await signInMutation.mutateAsync({ email, password, presenceStatus });
            setCurrentView('main');
        } catch (error) {
            throw error;
        }
    };

    const handleRegister = async (username: string, email: string, password: string) => {
        try {
            await signUpMutation.mutateAsync({
                username,
                email,
                password,
                displayName: username, // Use username as initial display name
            });
            setCurrentView('main');
        } catch (error) {
            throw error; // Re-throw to let the component handle the error
        }
    };

    if (!isAuthInitialized || isAuthLoading) {
        return (
            <Loading />
        );
    }

    if (currentView === 'signin') {
        return (
            <SignInScreen
                onSignIn={handleSignIn}
                onSwitchToRegister={() => setCurrentView('register')}
            />
        );
    }

    if (currentView === 'register') {
        return (
            <RegistrationScreen
                onRegister={handleRegister}
                onSwitchToSignIn={() => setCurrentView('signin')}
            />
        );
    }

    return (
        <ContactsScreen />
    );
}
