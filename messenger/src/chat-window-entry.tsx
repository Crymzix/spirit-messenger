import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { ChatWindow } from "./components/windows/chat-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <ChatWindow />,
);
