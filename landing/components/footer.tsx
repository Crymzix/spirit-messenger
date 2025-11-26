"use client"

import Image from "next/image"
import { motion } from "framer-motion"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
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
    <footer className="relative bg-background border-t border-border/50 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main footer content */}
        <motion.div
          className="py-16 grid md:grid-cols-3 gap-12 md:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {/* Brand section */}
          <motion.div className="md:col-span-1" variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/spirit-logo.png"
                alt="Spirit Messenger"
                width={0}
                height={0}
                className="w-auto h-8"
              />
              <span className="text-lg font-black bg-gradient-to-r from-[#11207e] to-[#0088d9] bg-clip-text text-transparent">Messenger</span>
            </div>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Bringing back the golden age of instant messaging with modern features and AI companions.
            </p>
          </motion.div>

          {/* Product links */}
          <motion.div variants={itemVariants}>
            <h4 className="font-bold text-foreground mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#features" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Features
                </a>
              </li>
              <li>
                <a href="#chat" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Demo
                </a>
              </li>
              <li>
                <a href="#download" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Downloads
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Changelog
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Help & Support */}
          <motion.div variants={itemVariants}>
            <h4 className="font-bold text-foreground mb-4">Help</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Setup Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/70 hover:text-accent transition-colors duration-200">
                  Contact
                </a>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent"></div>

        {/* Bottom footer */}
        <motion.div
          className="py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-foreground/60"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.p variants={itemVariants}>&copy; {currentYear} Spirit Messenger. All rights reserved.</motion.p>
          <motion.p className="text-center md:text-right" variants={itemVariants}>Bringing back the classics, reimagined for today</motion.p>
        </motion.div>
      </div>
    </footer>
  )
}
