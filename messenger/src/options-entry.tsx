import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { useAuthStore } from "./lib/store/auth-store";
import "./index.css";
import { OptionsWindow } from "./components";

function App() {
    const [isInitialized, setIsInitialized] = useState(false);
    const initialize = useAuthStore((state) => state.initialize);

    useEffect(() => {
        initialize().then(() => {
            setIsInitialized(true);
        });
    }, [initialize]);

    if (!isInitialized) {
        return <div>Loading...</div>;
    }

    return <OptionsWindow />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>,
);
