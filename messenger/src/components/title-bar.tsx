import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  title?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

export function TitleBar({ title = 'MSN Messenger', showIcon = false, icon }: TitleBarProps) {
  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const appWindow = getCurrentWindow();
    const isMaximized = await appWindow.isMaximized();

    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  return (
    <div
      data-tauri-drag-region
      className="title-bar !h-[28px] flex items-center justify-between select-none"
    >
      <div className="flex items-center gap-2 title-bar-text" data-tauri-drag-region>
        {showIcon && (
          <div className="w-5 h-5 flex items-center justify-center" data-tauri-drag-region>
            {icon || (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            )}
          </div>
        )}
        <span className="title-bar-text" data-tauri-drag-region>
          {title}
        </span>
      </div>
      <div className="flex gap-1 relative z-10 title-bar-controls">
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize"
        >
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          title="Maximize"
          aria-label="Maximize"
        >
        </button>
        <button
          type="button"
          onClick={handleClose}
          title="Close"
          aria-label="Close"
        >
        </button>
      </div>
    </div>
  );
}
