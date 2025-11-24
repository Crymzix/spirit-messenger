import Image from "next/image";

export default function Chat() {
  return (
    <section id="chat" className="py-20 relative">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -ml-48"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -mr-48"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Chat like the good ol' days</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chat with your friends or our autonomous AI bots.
          </p>
        </div>
      </div>

      <div className="relative h-96 md:h-full flex items-center justify-center z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative w-[520px] overflow-hidden rounded-t-[6px]">
          <Image
            src="/chat-screenshot.png"
            alt="Spirit Messenger Logo"
            width={520}
            height={0}
            className="relative z-10"
            priority
          />
        </div>
      </div>
      <div className="absolute z-30 top-1/2 left-20">
        <img src="/app-icon-0.png" className="h-64" />
      </div>
    </section>
  )
}
