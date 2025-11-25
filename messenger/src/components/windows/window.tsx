import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/query-client";
import { useAuthStore } from "../../lib/store/auth-store";
import { Loading } from "../loading";
import { useSettingsStore } from "@/lib";

interface WindowEntryWrapperProps {
    children: React.ReactNode;
    showLoading?: boolean
}

function WindowEntryWrapper({ children, showLoading = false }: WindowEntryWrapperProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const initialize = useAuthStore((state) => state.initialize);
    const loadSettings = useSettingsStore((state) => state.loadSettings);

    useEffect(() => {
        loadSettings().catch((error) => {
            console.error('Failed to load settings:', error);
        });
    }, [loadSettings]);

    useEffect(() => {
        initialize().then(() => {
            setIsInitialized(true);
        });
    }, [initialize]);

    if (!isInitialized && showLoading) {
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
