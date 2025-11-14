import { useState, useEffect } from "react";
import { SignInScreen } from "../screens/sign-in-screen";
import { RegistrationScreen } from "../screens/registration-screen";
import {
    useSignIn,
    useSignUp,
    useSignOut,
    useIsAuthenticated,
    useAuthLoading,
    useAuthInitialized,
} from "@/lib/hooks/auth-hooks";
import { ContactsScreen } from "../screens/contacts-screen";
import { Loading } from "../loading";

type AuthView = 'signin' | 'register' | 'main';

export function MainWindow() {
    const [currentView, setCurrentView] = useState<AuthView>('signin');

    const isAuthenticated = useIsAuthenticated();
    const isAuthLoading = useAuthLoading();
    const isAuthInitialized = useAuthInitialized();
    const signInMutation = useSignIn();
    const signUpMutation = useSignUp();
    const signOutMutation = useSignOut();

    useEffect(() => {
        if (isAuthInitialized && isAuthenticated) {
            setCurrentView('main');
        } else if (isAuthInitialized && !isAuthenticated) {
            setCurrentView('signin');
        }
    }, [isAuthInitialized, isAuthenticated]);

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

    const handleSignOut = async () => {
        await signOutMutation.mutateAsync();
        setCurrentView('signin');
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
        <ContactsScreen onSignOut={handleSignOut} />
    );
}
