import { getCurrentWindow } from '@tauri-apps/api/window';
import { CSSProperties } from 'react';

interface TitleBarProps {
  title?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
  className?: string
  style?: CSSProperties
}

export function TitleBar({ title = 'MSN Messenger', showIcon = true, className, style }: TitleBarProps) {
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
      style={style}
      className={`title-bar !h-[28px] flex items-center justify-between select-none ${className}`}
    >
      <div className="flex items-center gap-2 title-bar-text" data-tauri-drag-region>
        {showIcon && (
          <div className="size-6 flex items-center justify-center" data-tauri-drag-region>
            <img src='/msn-logo.png' />
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
