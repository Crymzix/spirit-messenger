import { ReactNode } from 'react';
import { TitleBar } from './title-bar';
import "xp.css/dist/XP.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showIcon?: boolean;
  icon?: ReactNode;
}

export function Layout({ children, title = 'Spirit Messenger', showIcon = true, icon }: LayoutProps) {
  return (
    <div className="window w-full h-screen flex flex-col">
      <TitleBar title={title} showIcon={showIcon} icon={icon} />
      <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Menu Bar */}
          <div className="">
            <div className="flex gap-0.5 text-md">
              <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                File
              </label>
              <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                Contacts
              </label>
              <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                Actions
              </label>
              <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                Tools
              </label>
              <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                Help
              </label>
            </div>
          </div>

          <div className="flex flex-col h-full overflow-y-hidden relative border border-[#A1A4B9] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] rounded-t-lg">
            <div className='flex-1 flex flex-col h-full w-full bg-[#FEFEFE] absolute top-0 left-0'>
              <div className='h-9 bg-gradient-to-b from-[#B8C6EA] to-transparent border border-[#FEFEFE] rounded-t-lg'>
              </div>
              <div
                className='flex-1'
                style={{
                  background: 'linear-gradient(to bottom, rgba(184, 198, 234, 0) 0%, rgba(184, 198, 234, 0.8) 50%, rgba(184, 198, 234, 0) 100%)'
                }}
              />
              <img src="/background-logo.webp" className='opacity-15 w-64 mt-auto ml-auto mb-10 mr-4' />
            </div>

            <div className="flex flex-col h-full z-10">
              {/* MSN Messenger Logo */}
              <div className="flex items-center gap-2 px-2">
                <img src="/spirit-logo.png" className='h-9' />
                <div className="flex items-center gap-1">
                  <label className="text-lg font-bold text-[#11207e] mt-3">Messenger</label>
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}