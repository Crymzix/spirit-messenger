import { useState } from "react";

const tabs = [
    { icon: '/msn-person.png', color: 'fill-blue-400', label: 'Contacts' },
];

export function ContactsTabs() {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className='w-14 h-full flex flex-col ml-[1px] mt-[1px] z-10 -mr-[4px] border-t-[0.5px] border-[#B8C6EA]'>
            <div className="relative flex flex-col">
                {tabs.map((tab, index) => (
                    <div
                        key={index}
                        className="relative overflow-hidden w-14 h-28 cursor-pointer group -mb-6 first:mt-0"
                        onClick={() => setActiveTab(index)}
                    >
                        <svg
                            viewBox="0 0 48 85"
                            className="absolute inset-0 w-full h-full"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <filter id="innerShadowTop" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="1" dy="1.5" stdDeviation="1.0" flood-color="#C0C9DE" />
                                </filter>

                                <filter id="innerShadowBottom" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dy="-1" stdDeviation="1.0" flood-color="#C0C9DE" />
                                </filter>
                            </defs>

                            <path d="M0 4Q0 0 4 0L48 0 48 85 48 85Q38 73 25 67 0 54 0 47Z" fill="white" />

                            <path d="M0 47 L0 4 Q0 0 4 0 L48 0"
                                fill="none"
                                stroke="#B8C6EA"
                                stroke-width="1"
                                filter="url(#innerShadowTop)" />

                            <path d="M44 85Q39 73 23 65 0 54 1 47"
                                fill="none"
                                stroke="#B8C6EA"
                                stroke-width="1"
                                filter="url(#innerShadowBottom)" />
                        </svg>

                        {/* Icon on top */}
                        <img src={tab.icon} className="absolute z-50 h-[48px] top-0 object-cover" />
                    </div>
                ))}
            </div>
        </div>
    )

}