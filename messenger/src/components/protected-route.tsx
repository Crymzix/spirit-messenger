/**
 * Protected Route Component
 * Redirects to sign-in if user is not authenticated
 */

import { ReactNode } from 'react';
import { useProtectedRoute, useAuthInitialized, useAuthLoading } from '../lib/hooks/auth-hooks';

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Wrapper component that protects routes from unauthenticated access
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
    const isProtected = useProtectedRoute();
    const isInitialized = useAuthInitialized();
    const isLoading = useAuthLoading();

    // Show loading state while initializing
    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen bg-msn-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-msn-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-msn">Loading...</p>
                </div>
            </div>
        );
    }

    // Show fallback or redirect if not authenticated
    if (!isProtected) {
        return fallback ? <>{fallback}</> : null;
    }

    // Render protected content
    return <>{children}</>;
}
