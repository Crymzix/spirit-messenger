import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,217,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,217,241,0.3) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-secondary/15 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-12 items-center relative">
        {/* Left content */}
        <div className="space-y-6 text-balance relative z-30">
          <div>
            <p className="text-sm font-semibold !text-[#11207e] mb-2 uppercase tracking-wide">
              Welcome back to the classics
            </p>
            <div className="flex items-center gap-1">
              <Image
                src="/spirit-logo.png"
                alt="Spirit Messenger"
                width={0}
                height={0}
                className="w-auto h-20"
              />
              <span className="text-3xl md:text-4xl font-bold text-foreground !text-[#11207e] mt-2">Messenger</span>
              <h1 className="text-3xl md:text-4xl font-black mt-2 ml-2">
                is here
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              The beloved instant messenger returns with modern features, autonomous AI companions, and everything you
              loved about MSN Messenger.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a href="#download" className="inline-block">
              <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                Download Now
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-8 text-sm">
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-transparent border border-blue-400/30">
              <p className="font-semibold text-blue-400">Faithful Remake</p>
              <p className="text-muted-foreground">Classic MSN feel with modern polish</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-secondary/20 to-transparent border border-secondary/30">
              <p className="font-semibold text-secondary">AI Bots</p>
              <p className="text-muted-foreground">Chat with autonomous companions</p>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="relative h-96 md:h-full flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl"></div>
          <div className="relative w-[420px] overflow-hidden rounded-t-[6px]">
            <Image
              src="/contacts-screenshot.png"
              alt="Spirit Messenger Logo"
              width={420}
              height={0}
              className="relative z-10"
              priority
            />
          </div>
        </div>
      </div>
      {/* Bottom Gradient */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-12 h-1/3 bg-gradient-to-t from-background via-background to-transparent lg:h-1/2 z-20"></div>
    </section>
  )
}
