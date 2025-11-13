import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import "./index.css";
import { ProfilePictureUpload } from "./components";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ProfilePictureUpload />
        </QueryClientProvider>
    </React.StrictMode>,
);
