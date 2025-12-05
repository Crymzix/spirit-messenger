"use client"

import Header from "@/components/header"
import SetupGuide from "@/components/setup-guide"
import Footer from "@/components/footer"

export default function SetupGuidePage() {
  return (
    <main
      className="min-h-screen bg-background text-foreground overflow-x-clip"
      style={{
        background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
      }}
    >
      <Header />
      <SetupGuide />
      <Footer />
    </main>
  )
}
