import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/query-client";
import { Loading } from "../loading";
import { useAuthStore, useSettingsStore } from "@/lib";
import { Subscription } from "@supabase/supabase-js";

interface WindowEntryWrapperProps {
    children: React.ReactNode;
    showLoading?: boolean
}

function WindowEntryWrapper({ children, showLoading = false }: WindowEntryWrapperProps) {
    const isAuthInitialized = useAuthStore(state => state.isAuthInitialized)
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
