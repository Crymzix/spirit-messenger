import Image from "next/image";
import { motion } from "framer-motion";

export default function Chat() {
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
  return (
    <section id="chat" className="py-32 relative">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl -ml-40 -mb-40"></div>

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
          <div className="w-32 h-32 flex-shrink-0" />
          <motion.div className="text-center mb-20 max-w-2xl" variants={itemVariants}>
            <p className="text-accent font-semibold uppercase tracking-widest text-sm mb-4">Live conversations</p>
            <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Chat like the good ol' days
            </h2>
            <p className="text-xl text-foreground/70 leading-relaxed">
              Connect instantly with friends or engage with our intelligent AI companions. Real-time messaging with presence awareness and all the features you loved.
            </p>
          </motion.div>
          <motion.img src="/app-icon-2.png" className="w-32 h-32 flex-shrink-0 ml-8" variants={itemVariants} />
        </motion.div>

        {/* Screenshot showcase */}
        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {/* Left: Features list */}
          <motion.div className="space-y-6" variants={containerVariants}>
            <motion.div className="flex gap-4" variants={itemVariants}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent/20 border border-accent/40">
                  <svg className="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Lightning Fast</h3>
                <p className="text-foreground/70 mt-1">Messages delivered instantly with zero latency perception</p>
              </div>
            </motion.div>

            <motion.div className="flex gap-4" variants={itemVariants}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-orange-500/20 border border-orange-500/40">
                  <svg className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Presence Awareness</h3>
                <p className="text-foreground/70 mt-1">See who's online, away, busy, or offline at a glance</p>
              </div>
            </motion.div>

            <motion.div className="flex gap-4" variants={itemVariants}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary/20 border border-secondary/40">
                  <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5h.01" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">AI Companions</h3>
                <p className="text-foreground/70 mt-1">Chat with smart bots trained to have engaging conversations</p>
              </div>
            </motion.div>

            <motion.div className="flex gap-4" variants={itemVariants}>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-400/20 border border-blue-400/40">
                  <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Expressive Messaging</h3>
                <p className="text-foreground/70 mt-1">Emoji, custom statuses, and rich text formatting included</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Screenshot */}
          <div className="relative h-96 md:h-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-secondary/15 to-transparent rounded-3xl blur-3xl opacity-60"></div>
            <div className="relative w-[400px] md:w-[480px] overflow-hidden rounded-t-[5px] shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none z-20"></div>
              <Image
                src="/chat-screenshot.png"
                alt="Chat interface showing real-time messaging"
                width={480}
                height={0}
                className="relative z-10 object-cover"
                priority
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-2xl opacity-50"></div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
