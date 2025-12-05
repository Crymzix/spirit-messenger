"use client"

import { motion } from "framer-motion"
import { useState } from "react"

interface FAQItem {
  title: string
  content: string | string[]
  icon?: string
  description?: string
}

const faqItems: FAQItem[] = [
  {
    title: "How do I install on macOS?",
    icon: "/apple.png",
    description: "Follow these simple steps to get Spirit Messenger running",
    content: [
      "1. Open Terminal on your Mac",
      "2. Type the following command (without quotes):",
      "   sudo xattr -rd com.apple.quarantine",
      "3. Drag and drop the Spirit Messenger app into Terminal. It should look like:",
      "   sudo xattr -rd com.apple.quarantine /Applications/Spirit\\ Messenger.app",
      "4. Press Enter and enter your password when prompted",
      "5. Wait for the command to complete",
      "6. The app is now ready to use!"
    ]
  },
  {
    title: "Why do I need to do this on Mac?",
    description: "Understanding the macOS security features",
    content: "Since Spirit Messenger is not yet signed with an Apple developer certificate, macOS marks it as untrusted. This command removes the quarantine attribute, allowing you to run the application safely."
  },
  {
    title: "Is this command safe?",
    description: "Security and system integrity",
    content: "Yes, this command is completely safe. It only removes the quarantine attribute that macOS automatically applies to downloaded applications. It doesn't modify the app itself or install anything on your system."
  },
  {
    title: "What if the command doesn't work?",
    description: "Troubleshooting common issues",
    content: "If you encounter issues, try these steps: 1) Make sure you've copied the command exactly, 2) Ensure the app file exists at the path you specified, 3) Try dragging the app file directly into Terminal to ensure the path is correct, 4) If Terminal shows 'command not found', restart Terminal and try again."
  },
  {
    title: "How do I install on Windows?",
    icon: "/microsoft.png",
    description: "Getting started on Windows 10 and later",
    content: [
      "1. Download the Spirit Messenger installer from the downloads page",
      "2. Once downloaded, double-click the .exe file to start installation",
      "3. If Windows shows a security warning, click 'More info' then 'Run anyway'",
      "4. Follow the installer prompts to complete the installation",
      "5. The app will launch automatically when installation is complete",
      "6. You're all set! The app is ready to use"
    ]
  },
  {
    title: "Windows says 'Unknown publisher' - is this safe?",
    description: "Understanding Windows SmartScreen protection",
    content: [
      "This warning appears because Spirit Messenger isn't yet signed with a Microsoft code signing certificate. This is completely normal for new applications.",
      "To proceed safely:",
      "1. Click 'More info' on the Windows SmartScreen dialog",
      "2. Click 'Run anyway' at the bottom of the dialog",
      "3. The installer will launch and installation will proceed normally",
      "Rest assured - the application is safe. The warning is just Windows being cautious about unrecognized publishers."
    ]
  },
  {
    title: "My antivirus is blocking the app",
    description: "Resolving antivirus false positives",
    content: [
      "Since Spirit Messenger is not yet code-signed, some antivirus software may flag it as unknown. This is a false positive - the application is safe.",
      "To whitelist the application:",
      "1. Open your antivirus software",
      "2. Go to Settings → Exclusions or Whitelist",
      "3. Add the Spirit Messenger executable to the whitelist",
      "4. Try running the app again",
      "Common antivirus programs: Windows Defender, Norton, McAfee, Kaspersky, Bitdefender",
      "If you're unsure how to whitelist on your specific antivirus, check their help documentation or support page."
    ]
  },
  {
    title: "How do I install on Linux?",
    icon: "/ubuntu.png",
    description: "Getting started with the AppImage",
    content: [
      "1. Download the Spirit Messenger .AppImage file from the downloads page",
      "2. Open a terminal in the folder where you downloaded the file",
      "3. Make the file executable by running:",
      "   chmod +x Spirit-Messenger.AppImage",
      "4. Run the app by double-clicking it or typing:",
      "   ./Spirit-Messenger.AppImage",
      "5. The app will launch and you're ready to use it",
      "Note: If you see 'command not found' errors, you may need to install missing dependencies (see the next question)"
    ]
  },
  {
    title: "The app won't launch on Linux - missing dependencies",
    description: "Installing required system libraries",
    content: [
      "Spirit Messenger requires some system libraries. If the app won't start, install these dependencies based on your Linux distribution:",
      "",
      "Ubuntu/Debian:",
      "   sudo apt update && sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1 libssl3",
      "",
      "Fedora:",
      "   sudo dnf install webkit2gtk4.1 libappindicator-gtk3 openssl",
      "",
      "Arch Linux:",
      "   sudo pacman -S webkit2gtk libappindicator-gtk3 openssl",
      "",
      "Alpine:",
      "   apk add webkit2gtk libappindicator openssl",
      "",
      "After installing, try launching the app again."
    ]
  },
  {
    title: "Error: 'cannot execute binary file' or 'Permission denied' on Linux",
    description: "Fixing AppImage execution issues",
    content: [
      "This error occurs when the AppImage doesn't have execute permissions.",
      "",
      "Method 1 - Terminal:",
      "1. Open Terminal in the folder containing the AppImage",
      "2. Run:",
      "   chmod +x Spirit-Messenger.AppImage",
      "3. Now you can double-click it to run",
      "",
      "Method 2 - File Manager GUI:",
      "1. Right-click the Spirit-Messenger.AppImage file",
      "2. Select 'Properties' or 'Permissions'",
      "3. Check the box that says 'Allow executing file as program' or 'Is executable'",
      "4. Close the dialog and double-click the app to run it"
    ]
  },
  {
    title: "What are the system requirements?",
    description: "Minimum requirements for each platform",
    content: [
      "macOS:",
      "   • macOS 10.15 (Catalina) or later",
      "   • Intel or Apple Silicon processor",
      "",
      "Windows:",
      "   • Windows 10 or Windows 11",
      "   • WebView2 Runtime (usually pre-installed)",
      "   • 200 MB free disk space",
      "",
      "Linux:",
      "   • Modern 64-bit Linux distribution (Ubuntu 20.04+, Fedora 35+, etc.)",
      "   • GTK3 libraries installed",
      "   • WebKit2GTK libraries installed",
      "   • 200 MB free disk space",
      "",
      "All Platforms:",
      "   • Active internet connection recommended for messaging features"
    ]
  },
  {
    title: "The app crashes when I try to open it",
    description: "Troubleshooting launch failures",
    content: [
      "If the app crashes on startup, try these steps:",
      "",
      "1. Restart your computer - Sometimes this solves temporary issues",
      "",
      "2. Reinstall the app:",
      "   • Completely remove the application",
      "   • Download the latest version from the downloads page",
      "   • Install it fresh",
      "",
      "3. Check your system meets the requirements (see 'What are the system requirements?' FAQ)",
      "",
      "4. Ensure you have the necessary permissions:",
      "   • On Linux, make sure the AppImage has execute permissions",
      "   • On macOS, complete the xattr command from the installation FAQ",
      "   • On Windows, add to antivirus whitelist if flagged",
      "",
      "5. If crashes persist, try launching from terminal to see error messages:",
      "   • macOS/Linux: Open Terminal and run the app to see debug output",
      "   • Windows: Right-click the app → Run as administrator"
    ]
  },
  {
    title: "Why is the app asking for camera/microphone permissions?",
    description: "Understanding permission requests",
    content: [
      "Spirit Messenger requests camera and microphone permissions to enable video and voice calling features.",
      "",
      "To grant permissions:",
      "",
      "macOS:",
      "   1. When prompted, click 'Allow' to grant access",
      "   2. Or go to System Preferences → Security & Privacy → Camera/Microphone",
      "   3. Find 'Spirit Messenger' and ensure it's allowed",
      "",
      "Windows:",
      "   1. When prompted, click 'Yes' to allow access",
      "   2. Or go to Settings → Privacy & security → Camera/Microphone",
      "   3. Scroll down and ensure 'Spirit Messenger' is allowed",
      "",
      "Linux:",
      "   • Permission handling depends on your desktop environment",
      "   • Browser or system dialogs may appear - grant access as prompted",
      "   • Or configure via your desktop environment's privacy settings",
      "",
      "You can still use text messaging without granting these permissions, but video and voice calls won't work."
    ]
  }
]

export default function SetupGuide() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

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
    <section id="setup-guide" className="py-32 relative">
      {/* Enhanced background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/25 rounded-full blur-3xl -mt-48 opacity-50"></div>
        <div className="absolute bottom-1/3 -right-1/4 w-[700px] h-[700px] bg-secondary/20 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/2 -left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header with enhanced styling */}
        <motion.div
          className="text-center mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          <div className="inline-block mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/30 to-secondary/20 border border-accent/40 mx-auto">
              <svg className="h-8 w-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-accent font-semibold uppercase tracking-widest text-sm mb-4">Getting Started</p>
          <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
            Setup Guide & FAQ
          </h2>
          <p className="text-xl text-foreground/70 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know to get Spirit Messenger running smoothly on your Mac. Follow our easy-to-follow guides.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          className="space-y-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              className="group"
              variants={itemVariants}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-left transition-all duration-300 ${openIndex === index
                  ? "bg-gradient-to-br from-accent/25 to-accent/10 border-accent/60 shadow-lg shadow-accent/20"
                  : "bg-gradient-to-br from-accent/10 to-transparent border-accent/30 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:from-accent/15"
                  } rounded-2xl border backdrop-blur-sm`}
              >
                <div className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    {item.icon && (
                      <div className="flex-shrink-0">
                        <div className={`flex items-center justify-center h-14 w-14 rounded-xl transition-all duration-300 ${openIndex === index
                          ? "bg-gradient-to-br from-accent/40 to-accent/20 border border-accent/50 shadow-lg"
                          : "bg-gradient-to-br from-accent/25 to-accent/10 border border-accent/30 group-hover:from-accent/30 group-hover:to-accent/15"
                          }`}>
                          <img src={item.icon} alt="" className="w-7 h-7 object-contain" />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground mb-1 truncate">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-foreground/60 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className={`h-6 w-6 text-accent transition-all duration-300 ${openIndex === index ? "rotate-180 scale-110" : ""
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded content with improved styling */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: openIndex === index ? 1 : 0,
                  height: openIndex === index ? "auto" : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-4 border border-accent/30 border-t-0 bg-gradient-to-br from-accent/15 via-accent/8 to-transparent rounded-2xl">
                  {Array.isArray(item.content) ? (
                    <div className="space-y-3">
                      {item.content.map((line, lineIndex) => (
                        <motion.p
                          key={lineIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: lineIndex * 0.05 }}
                          className={`text-foreground/85 leading-relaxed ${line.startsWith("   ")
                            ? "bg-gradient-to-r from-black/40 to-black/20 rounded-lg px-4 py-3 text-sm border border-accent/20 text-accent/90 shadow-inner"
                            : "font-medium text-base"
                            }`}
                        >
                          {line}
                        </motion.p>
                      ))}
                    </div>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-foreground/85 leading-relaxed text-base"
                    >
                      {item.content}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
