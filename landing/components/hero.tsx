import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  }

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8 },
    },
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,217,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(201,217,241,0.15) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        ></div>
      </div>

      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      <div className="absolute top-1/3 -right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-16 items-center relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left content */}
        <motion.div className="space-y-8 text-balance" variants={itemVariants}>
          <div className="space-y-6">
            <motion.div variants={itemVariants}>
              <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
                Bringing Back the Era
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                <span className="bg-gradient-to-r from-[#11207e] via-[#0088d9] to-accent bg-clip-text text-transparent">Spirit Messenger</span>
              </h1>
            </motion.div>
            <motion.p className="text-xl text-foreground/80 leading-relaxed max-w-lg" variants={itemVariants}>
              The instant messenger you loved, reimagined for today. Connect with friends, chat with AI companions, and relive the golden age of online communication.
            </motion.p>
          </div>

          <motion.div className="flex flex-col sm:flex-row gap-4 pt-6" variants={itemVariants}>
            <a href="#download" className="inline-block">
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-8 h-12 rounded-lg shadow-lg hover:shadow-xl transition-all">
                Download Now
              </Button>
            </a>
            <a href="#features" className="inline-block">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold text-base px-8 h-12 rounded-lg border-2 hover:bg-foreground/5 transition-all">
                Learn More
              </Button>
            </a>
          </motion.div>

          {/* Stats/Benefits */}
          <motion.div className="grid grid-cols-2 gap-6 pt-8" variants={containerVariants}>
            <motion.div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30 hover:border-orange-500/50 transition-colors" variants={itemVariants}>
              <p className="font-bold text-foreground text-lg">Nostalgia</p>
              <p className="text-sm text-foreground/60">Classic MSN experience modernized</p>
            </motion.div>
            <motion.div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 hover:border-accent/50 transition-colors" variants={itemVariants}>
              <p className="font-bold text-foreground text-lg">AI Bots</p>
              <p className="text-sm text-foreground/60">Chat with smart companions</p>
            </motion.div>
            <motion.div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/30 hover:border-secondary/50 transition-colors" variants={itemVariants}>
              <p className="font-bold text-foreground text-lg">Real-Time</p>
              <p className="text-sm text-foreground/60">Instant messaging at light speed</p>
            </motion.div>
            <motion.div className="p-4 rounded-xl bg-gradient-to-br from-blue-400/10 to-transparent border border-blue-400/30 hover:border-blue-400/50 transition-colors" variants={itemVariants}>
              <p className="font-bold text-foreground text-lg">Cross-Platform</p>
              <p className="text-sm text-foreground/60">Windows, Mac, Linux ready</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right content - Screenshot showcase */}
        <motion.div className="relative h-96 md:h-full flex items-center justify-center" variants={imageVariants}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/10 rounded-3xl blur-3xl opacity-60"></div>
          <div className="relative w-[380px] md:w-[420px] overflow-hidden rounded-t-[5px] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none z-20"></div>
            <Image
              src="/contacts-screenshot.png"
              alt="Spirit Messenger Screenshot"
              width={420}
              height={0}
              className="relative z-10 object-cover"
              priority
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/50 to-transparent"></div>

      <img src="/background-logo.webp" className='opacity-15 absolute right-0 bottom-0 w-96' />
    </section>
  )
}
