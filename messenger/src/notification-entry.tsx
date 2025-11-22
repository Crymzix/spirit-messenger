import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { NotificationWindow } from "./components/windows/notification-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <NotificationWindow />,
);
