import "./index.css";
import { ProfilePictureUploadWindow } from "./components";
import { renderWindowEntry } from "./components/windows/window";

renderWindowEntry(
    document.getElementById("root") as HTMLElement,
    <ProfilePictureUploadWindow />,
);
