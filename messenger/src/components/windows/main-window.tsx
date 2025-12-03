import { useState, useEffect, useRef } from "react";
import { SignInScreen } from "../screens/sign-in-screen";
import { RegistrationScreen } from "../screens/registration-screen";
import {
    useUser,
    useSignIn,
    useSignUp,
} from "@/lib/hooks/auth-hooks";
import { useGlobalMessageUpdates } from "@/lib/hooks/message-hooks";
import { ContactsScreen } from "../screens/contacts-screen";
import { Loading } from "../loading";
import { useFileUploadStore } from "@/lib/store/file-upload-store";
import { initPresenceLifecycle, startActivityTracking, initPresenceChannel } from "@/lib/services/presence-service";
import { useCallUpdates } from "@/lib/hooks/call-hooks";
import { PresenceStatus } from "@/types";
import { useAuthStore } from "@/lib";

type AuthView = 'signin' | 'register' | 'main';

export function MainWindow() {
    const [currentView, setCurrentView] = useState<AuthView>('signin');
    const presenceInitialized = useRef(false);

    const { data: user } = useUser()
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

    // Initialize presence lifecycle and activity tracking when authenticated
    useEffect(() => {
        if (isAuthInitialized && isAuthenticated && user?.id) {
            // Skip if already initialized (handles React Strict Mode double-invoke)
            if (presenceInitialized.current) {
                return;
            }
            presenceInitialized.current = true;

            // Initialize Supabase Presence channel for disconnect detection
            initPresenceChannel(user.id).catch((error) => {
                console.error('Failed to initialize presence channel:', error);
            });

            // Initialize Tauri lifecycle listeners for presence
            // This handles the actual window close/quit - we don't need React cleanup
            initPresenceLifecycle().catch((error) => {
                console.error('Failed to initialize presence lifecycle:', error);
            });

            // Start activity tracking for auto-away with user's current status
            const initialStatus = user.presenceStatus || 'online';
            startActivityTracking(initialStatus);
            // No need to update user here - status is already set from login
        }
    }, [isAuthInitialized, isAuthenticated, user?.id]);

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
