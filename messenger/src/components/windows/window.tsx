import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/query-client";
import { Loading } from "../loading";
import { initPresenceChannel, initPresenceLifecycle, startActivityTracking, useAuthStore, useSettingsStore, useUser } from "@/lib";
import { Subscription } from "@supabase/supabase-js";

interface WindowEntryWrapperProps {
    children: React.ReactNode;
    showLoading?: boolean
}

function WindowEntryWrapper({ children, showLoading = false }: WindowEntryWrapperProps) {
    const isAuthInitialized = useAuthStore(state => state.isAuthInitialized)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const presenceInitialized = useRef(false);
    const { data: user } = useUser()
    const loadSettings = useSettingsStore((state) => state.loadSettings);
    const initialize = useAuthStore(state => state.initialize)

    useEffect(() => {
        loadSettings().catch((error) => {
            console.error('Failed to load settings:', error);
        });
    }, [loadSettings]);

    useEffect(() => {
        let subcription: Subscription | undefined = undefined
        initialize().then((res) => {
            subcription = res
        })
        return () => {
            subcription?.unsubscribe()
        }
    }, []);

    // Initialize presence channel, lifecycle, and activity tracking when authenticated
    // Note: Presence lifecycle (onCloseRequested) only registers for main window
    // All windows share the same presence channel and contribute to activity tracking
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

    if (!isAuthInitialized && showLoading) {
        return <Loading />
    }

    return <>{children}</>;
}

export function renderWindowEntry(
    rootElement: HTMLElement,
    component: React.ReactNode,
    showLoading?: boolean
) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <WindowEntryWrapper showLoading={showLoading}>{component}</WindowEntryWrapper>
            </QueryClientProvider>
        </React.StrictMode>,
    );
}
