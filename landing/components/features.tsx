"use client"

import { motion } from "framer-motion"

const features = [
  {
    title: "Classic Contacts",
    description: "Organize and manage your contacts just like the original. Add, block, and stay connected with ease.",
    icon: "/people.png",
    iconColor: "from-blue-400/50 to-blue-500/35",
    color: "from-blue-400/15 to-blue-500/5",
    borderColor: "border-blue-400/40",
    accentColor: "text-blue-500",
  },
  {
    title: "Instant Messaging",
    description: "Lightning-fast messaging with real-time conversations and presence indicators for all friends.",
    icon: "/desktop-notification.png",
    iconColor: "from-accent/50 to-accent/35",
    color: "from-accent/15 to-accent/5",
    borderColor: "border-accent/40",
    accentColor: "text-accent",
  },
  {
    title: "Status Updates",
    description: "Show your mood and availability with customizable status messages and expressive emoji support.",
    icon: "/desktop-art.png",
    iconColor: "from-secondary/50 to-secondary/35",
    color: "from-secondary/15 to-secondary/5",
    borderColor: "border-secondary/40",
    accentColor: "text-secondary",
  },
  {
    title: "Group Chat",
    description: "Join group conversations and connect with multiple friends simultaneously in dedicated chat rooms.",
    icon: "/desktop-chat.png",
    iconColor: "from-purple-400/50 to-purple-500/35",
    color: "from-purple-400/15 to-purple-500/5",
    borderColor: "border-purple-400/40",
    accentColor: "text-purple-500",
  },
  {
    title: "File Sharing",
    description: "Effortlessly send and receive files from your contacts with secure, real-time file transfers.",
    icon: "/folder.png",
    iconColor: "from-orange-400/50 to-orange-500/35",
    color: "from-orange-400/15 to-orange-500/5",
    borderColor: "border-orange-400/40",
    accentColor: "text-orange-500",
  },
  {
    title: "Smart Notifications",
    description: "Stay updated with intelligent notifications so you never miss an important message from friends.",
    icon: "/sound.png",
    iconColor: "from-pink-400/50 to-pink-500/35",
    color: "from-pink-400/15 to-pink-500/5",
    borderColor: "border-pink-400/40",
    accentColor: "text-pink-500",
  },
]

export default function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.1 },
    },
  }

  return (
    <section id="features" className="py-32 relative">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background to-transparent"></div>
      <div className="absolute top-1/2 -right-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl opacity-40"></div>
      <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] bg-secondary/15 rounded-full blur-3xl opacity-30"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          className="flex items-center justify-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.img src="/app-icon-0.png" className="w-32 h-32 flex-shrink-0 mr-8" variants={itemVariants} />
          <motion.div className="text-center mb-20 max-w-2xl" variants={itemVariants}>
            <p className="text-accent font-semibold uppercase tracking-widest text-sm mb-4">Everything you remember</p>
            <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              All the features you loved
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed">
              Spirit Messenger brings back everything from the golden age with modern improvements, enhanced stability, and exciting new AI-powered features that keep you connected.
            </p>
          </motion.div>
          <div className="w-32 h-32 flex-shrink-0" />
        </motion.div>

        {/* Feature grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`group relative p-8 rounded-2xl border ${feature.borderColor} bg-gradient-to-br ${feature.color} backdrop-blur-sm hover:border-accent/60 transition-all duration-300 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1`}
              variants={itemVariants}
              whileHover={{ y: -8 }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${feature.borderColor.split('-')[1]}15 0%, transparent 80%)`,
              }}></div>

              <div className="relative z-10 flex flex-col h-full space-y-4">
                {/* Icon */}
                <div className={`size-18 rounded-xl bg-gradient-to-br ${feature.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <img src={feature.icon} alt={feature.title} className="w-full h-full object-contain" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-foreground/70 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
