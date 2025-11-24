const features = [
  {
    title: "Classic Contacts",
    description: "Organize and manage your contacts just like the original. Add, block, and stay connected.",
    icon: "/people.png",
    color: "from-blue-400/20 to-transparent",
    borderColor: "border-blue-400/30",
  },
  {
    title: "Instant Messaging",
    description: "Lightning-fast messaging with real-time conversations and presence indicators.",
    icon: "/desktop-notification.png",
    color: "from-accent/20 to-transparent",
    borderColor: "border-accent/30",
  },
  {
    title: "Status Updates",
    description: "Show your mood and availability with customizable status messages and emoji.",
    icon: "/desktop-art.png",
    color: "from-secondary/20 to-transparent",
    borderColor: "border-secondary/30",
  },
  {
    title: "Chat Rooms",
    description: "Join group conversations and connect with multiple friends simultaneously.",
    icon: "/desktop-chat.png",
    color: "from-blue-400/20 to-transparent",
    borderColor: "border-blue-400/30",
  },
  {
    title: "File Sharing",
    description: "Effortlessly send and receive files from your contacts in real-time.",
    icon: "/folder.png",
    color: "from-accent/20 to-transparent",
    borderColor: "border-accent/30",
  },
  {
    title: "Desktop Notifications",
    description: "Stay updated with instant notifications so you never miss a message.",
    icon: "/sound.png",
    color: "from-secondary/20 to-transparent",
    borderColor: "border-secondary/30",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 relative">
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-1/3 bg-gradient-to-b from-background via-background to-transparent lg:h-1/2 z-20"></div>
      <div className="absolute right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 z-30"></div>
      <div className="absolute left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl -ml-40"></div>
      <div className="absolute z-30 -top-40 right-20">
        <img src="/background-logo.png" className="h-64" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-40">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">All the features you loved</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Spirit Messenger brings back everything you remember with modern improvements and new AI-powered features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group px-4 py-6 flex flex-col items-center rounded-lg border ${feature.borderColor} bg-gradient-to-br ${feature.color} hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/20`}
            >
              <img className="size-30" src={feature.icon} />
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="px-4 text-muted-foreground text-sm text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
