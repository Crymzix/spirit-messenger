import "./index.css";
import { renderWindowEntry } from "./components/windows/window";
import { MainWindow } from "./components";

renderWindowEntry(
  document.getElementById("root") as HTMLElement,
  <MainWindow />,
  true
);
