import { useState, useEffect } from "react";
import { SignInScreen } from "../screens/sign-in-screen";
import { RegistrationScreen } from "../screens/registration-screen";
import {
    useSignIn,
    useSignUp,
    useIsAuthenticated,
    useAuthLoading,
    useAuthInitialized,
} from "@/lib/hooks/auth-hooks";
import { ContactsScreen } from "../screens/contacts-screen";
import { Loading } from "../loading";
import { useFileUploadStore } from "@/lib/store/file-upload-store";

type AuthView = 'signin' | 'register' | 'main';

export function MainWindow() {
    const [currentView, setCurrentView] = useState<AuthView>('signin');

    const isAuthenticated = useIsAuthenticated();
    const isAuthLoading = useAuthLoading();
    const isAuthInitialized = useAuthInitialized();
    const signInMutation = useSignIn();
    const signUpMutation = useSignUp();
    const initializeMainWindow = useFileUploadStore((state) => state.initializeMainWindow);

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

    const handleSignIn = async (email: string, password: string) => {
        try {
            await signInMutation.mutateAsync({ email, password });
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
