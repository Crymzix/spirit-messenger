import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { AddToGroupWindow } from "./components/windows/add-to-group-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <AddToGroupWindow />,
);
