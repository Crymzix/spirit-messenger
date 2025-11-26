"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/spirit-logo.png"
            alt="Spirit Messenger"
            width={0}
            height={0}
            className="w-auto h-9"
          />
          <span className="text-lg font-black bg-gradient-to-r from-[#11207e] to-[#0088d9] bg-clip-text text-transparent">Messenger</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors duration-200">
            Features
          </a>
          <a href="#chat" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors duration-200">
            Demo
          </a>
          <a href="#download" className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors duration-200">
            Download
          </a>
        </nav>
        <a href="#download" className="hidden md:block">
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium">
            Get Started
          </Button>
        </a>
      </div>
    </header>
  )
}
