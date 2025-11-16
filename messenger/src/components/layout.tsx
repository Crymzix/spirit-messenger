import { ReactNode, useEffect, useRef, useState } from 'react';
import { TitleBar } from './title-bar';
import "xp.css/dist/XP.css";
import { useSignOut } from '@/lib';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showIcon?: boolean;
  icon?: ReactNode;
}

export function Layout({ children, title = 'Spirit Messenger', showIcon = true, icon }: LayoutProps) {
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const fileDropdownRef = useRef<HTMLDivElement>(null);

  const [isContactsDropdownOpen, setIsContactsDropdownOpen] = useState(false);
  const contactsDropdownRef = useRef<HTMLDivElement>(null)

  const signOutMutation = useSignOut();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileDropdownRef.current && !fileDropdownRef.current.contains(event.target as Node)) {
        setIsFileDropdownOpen(false);
      }
    }

    if (isFileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFileDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactsDropdownRef.current && !contactsDropdownRef.current.contains(event.target as Node)) {
        setIsContactsDropdownOpen(false);
      }
    }

    if (isContactsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isContactsDropdownOpen]);

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
  };

  return (
    <div className="window w-full h-screen flex flex-col">
      <TitleBar title={title} showIcon={showIcon} icon={icon} />
      <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Menu Bar */}
          <div className="">
            <div className="flex gap-0.5 text-md">
              <div ref={fileDropdownRef} className='relative'>
                <label
                  onClick={() => setIsFileDropdownOpen(true)}
                  className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                  File
                </label>
                {isFileDropdownOpen && (
                  <div
                    style={{
                      borderLeft: '1px solid #DFDFDF',
                      borderTop: '1px solid #DFDFDF',
                      borderRight: '1px solid #404040',
                      borderBottom: '1px solid #404040',
                    }}
                    className="absolute top-full left-0 bg-white border border-gray-400 min-w-48 z-50">
                    <div
                      key="sign-out"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-[#274997] hover:text-white text-left whitespace-nowrap"
                    >
                      <div className='w-4' />
                      <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                      >
                        Sign out
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div ref={contactsDropdownRef} className='relative'>
                <label
                  onClick={() => setIsContactsDropdownOpen(true)}
                  className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                  Contacts
                </label>
                {isContactsDropdownOpen && (
                  <div
                    style={{
                      borderLeft: '1px solid #DFDFDF',
                      borderTop: '1px solid #DFDFDF',
                      borderRight: '1px solid #404040',
                      borderBottom: '1px solid #404040',
                    }}
                    className="absolute top-full left-0 bg-white border border-gray-400 min-w-64 z-50">
                    <div
                      key="add-contact"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-[#274997] hover:text-white text-left whitespace-nowrap"
                    >
                      <div className='w-4' />
                      <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                      >
                        Add a Contact...
                      </span>
                    </div>
                    <div className='h-[1px] w-full bg-gray-400'></div>
                    <div
                      key="view-display-pictures"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-[#274997] hover:text-white text-left whitespace-nowrap"
                    >
                      <div className='w-4' />
                      <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                      >
                        View Display Pictures
                      </span>
                    </div>
                    <div className='h-[1px] w-full bg-gray-400'></div>
                    <div
                      key="manage-contacts"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-[#274997] hover:text-white text-left whitespace-nowrap"
                    >
                      <div className='w-4' />
                      <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                      >
                        Manage Contacts
                      </span>
                    </div>
                    <div
                      key="manage-groups"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-[#274997] hover:text-white text-left whitespace-nowrap"
                    >
                      <div className='w-4' />
                      <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                      >
                        Manage Groups
                      </span>
                    </div>
                  </div>
                )}
              </div>
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