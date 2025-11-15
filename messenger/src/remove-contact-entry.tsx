import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { RemoveContactWindow } from "./components/windows/remove-contact-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <RemoveContactWindow />,
);
