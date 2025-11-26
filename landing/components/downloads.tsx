"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const downloads = [
  {
    platform: "Windows",
    extension: ".exe",
    description: "Windows 10, 11 and later",
    icon: "/microsoft.png",
    color: "from-blue-500/15 to-blue-600/5",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500",
  },
  {
    platform: "macOS",
    extension: ".dmg",
    description: "Mac OS X 10.15 and later",
    icon: "/apple.png",
    color: "from-accent/15 to-accent/5",
    borderColor: "border-accent/40",
    bgColor: "bg-accent",
  },
  {
    platform: "Linux",
    extension: ".AppImage",
    description: "Ubuntu 18.04 and later",
    icon: "/ubuntu.png",
    color: "from-orange-500/15 to-orange-600/5",
    borderColor: "border-orange-500/40",
    bgColor: "bg-orange-500",
  },
]

export default function Downloads() {
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
    <section id="download" className="py-32 relative">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl -ml-48"></div>
        <div className="absolute bottom-1/3 right-0 w-[600px] h-[600px] bg-accent/15 rounded-full blur-3xl -mr-48"></div>
        <img src="/msn-background.png" className="absolute bottom-0 right-0 w-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          className="flex items-center justify-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.img src="/app-icon-1.png" className="w-32 h-32 mr-8" variants={itemVariants} />
          <motion.div className="text-center mb-20 max-w-2xl" variants={itemVariants}>
            <p className="text-accent font-semibold uppercase tracking-widest text-sm mb-4">Get started now</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Download Spirit Messenger
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed">
              Choose your platform and start chatting with friends today. All versions include full features, updates, and support.
            </p>
          </motion.div>
          <div className="w-32 h-32 flex-shrink-0" />
        </motion.div>

        {/* Download cards grid */}
        <motion.div
          className="grid md:grid-cols-3 gap-8 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {downloads.map((download, index) => (
            <motion.div
              key={index}
              className={`group relative p-8 rounded-2xl border ${download.borderColor} bg-gradient-to-br ${download.color} backdrop-blur-sm hover:border-accent/60 transition-all duration-300 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-2 overflow-hidden`}
              variants={itemVariants}
              whileHover={{ y: -8 }}
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${download.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

              <div className="relative z-10 flex flex-col h-full space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${download.color} border ${download.borderColor}`}>
                    <img src={download.icon} alt={download.platform} className="w-12 h-12 object-contain" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-2 flex-1">
                  <h3 className="text-2xl font-bold text-foreground">{download.platform}</h3>
                  <p className="text-sm text-foreground/70">{download.description}</p>
                </div>

                {/* Download button */}
                <Button size="lg" className={`w-full ${download.bgColor} hover:opacity-90 text-white font-semibold text-base h-12 rounded-lg transition-all shadow-lg group-hover:shadow-xl`}>
                  Download {download.extension}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Support section */}
        <motion.div
          className="relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          <div className="p-8 rounded-2xl bg-gradient-to-r from-primary/80 to-accent/35 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Need help setting up?</h3>
                <p className="text-foreground/70 mb-4">
                  Our detailed setup guides and FAQ section will help you get Spirit Messenger running smoothly on your computer.
                </p>
              </div>
              <div className="flex gap-4 md:justify-end">
                <a href="#" className="inline-block">
                  <Button variant="outline" className="border-2 font-semibold">
                    Setup Guide
                  </Button>
                </a>
                <a href="#" className="inline-block">
                  <Button variant="outline" className="border-2 font-semibold">
                    FAQ
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System requirements notice */}
        <div className="mt-12 text-center">
          <p className="text-sm text-foreground/50">
            Minimum system requirements: 1GB RAM, 50MB disk space. All platforms include automatic updates and cloud sync.
          </p>
        </div>
      </div>
    </section>
  )
}
