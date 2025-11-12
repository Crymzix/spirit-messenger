import { ReactNode } from 'react';
import { TitleBar } from './title-bar';
import "xp.css/dist/XP.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showIcon?: boolean;
  icon?: ReactNode;
}

export function Layout({ children, title = 'MSN Messenger', showIcon = false, icon }: LayoutProps) {
  return (
    <div className="window w-full h-screen flex flex-col">
      <TitleBar title={title} showIcon={showIcon} icon={icon} />
      <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
        {children}
      </div>
    </div>
  );
}