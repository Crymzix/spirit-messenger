import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { AddContactWindow } from "./components/windows/add-contact-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <AddContactWindow />,
);
