"use client"

import Image from "next/image"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/40 backdrop-blur-lg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Image
            src="/spirit-logo.png"
            alt="Spirit Messenger"
            width={0}
            height={0}
            className="w-auto h-10"
          />
          <span className="text-xl font-bold text-foreground !text-[#11207e] mt-1">Messenger</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm hover:text-accent transition">
            Features
          </a>
          <a href="#download" className="text-sm hover:text-accent transition">
            Download
          </a>
        </nav>
      </div>
    </header>
  )
}
