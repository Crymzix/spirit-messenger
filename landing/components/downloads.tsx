import { Button } from "@/components/ui/button"

const downloads = [
  {
    platform: "Windows",
    extension: ".exe",
    description: "Windows 10 and later",
    icon: "/microsoft.png",
    color: "from-blue-400/20 to-blue-400",
    borderColor: "border-blue-400",
  },
  {
    platform: "macOS",
    extension: ".dmg",
    description: "Mac OS X 10.15 and later",
    icon: "/apple.png",
    color: "from-accent/20 to-accent",
    borderColor: "border-accent",
  },
  {
    platform: "Linux",
    extension: ".AppImage",
    description: "Ubuntu 18.04 and later",
    icon: "/ubuntu.png",
    color: "from-secondary/20 to-secondary",
    borderColor: "border-secondary",
  },
]

export default function Downloads() {
  return (
    <section id="download" className="py-20 relative">
      <div className="absolute bottom-1/2 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -mr-40 -mb-40"></div>
      <div className="absolute top-1/2 w-72 h-72 bg-accent/10 rounded-full blur-3xl -mt-40"></div>
      <img className="absolute bottom-0 right-0" src="/msn-background.png" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Download Now</h2>
          <p className="text-lg text-muted-foreground">
            Get Spirit Messenger for your platform and start reconnecting with friends.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {downloads.map((download, index) => (
            <div
              key={index}
              className={`flex flex-col items-center text-center p-8 rounded-lg border ${download.borderColor} bg-gradient-to-br ${download.color} hover:border-accent/50 transition-all group hover:shadow-lg hover:shadow-accent/20`}
            >
              <img
                src={download.icon}
                className="size-10 mb-4"
              />
              <h3 className="text-2xl font-bold mb-1">{download.platform}</h3>
              <p className="text-sm text-foreground mb-4">{download.description}</p>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Download {download.extension}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-lg bg-gradient-to-r from-accent to-secondary text-center">
          <p className="text-sm text-foreground mb-2">Installation help?</p>
          <a href="#" className="text-black hover:text-accent font-semibold transition-colors">
            Read our setup guide
          </a>
        </div>
      </div>
    </section>
  )
}
