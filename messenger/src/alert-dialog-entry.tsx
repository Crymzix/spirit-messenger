import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { AlertDialogWindow } from "./components/windows/alert-dialog-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <AlertDialogWindow />,
);
