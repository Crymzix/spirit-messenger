import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { AddGroupWindow } from "./components/windows/add-group-window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <AddGroupWindow />,
);
