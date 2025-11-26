"use client"

import Header from "@/components/header"
import Hero from "@/components/hero"
import Features from "@/components/features"
import Chat from "@/components/chat"
import Downloads from "@/components/downloads"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main
      className="min-h-screen bg-background text-foreground overflow-x-clip"
      style={{
        background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
      }}
    >
      <Header />
      <Hero />
      <Features />
      <Chat />
      <Downloads />
      <Footer />
    </main>
  )
}
