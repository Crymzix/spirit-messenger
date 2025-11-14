import "./index.css";
import { OptionsWindow } from "./components";
import { renderWindowEntry } from "./components/windows/window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <OptionsWindow />,
);
