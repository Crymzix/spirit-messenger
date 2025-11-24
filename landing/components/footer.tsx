export default function Footer() {
  return (
    <footer className="bg-background py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-accent transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#bots" className="hover:text-accent transition">
                  AI Bots
                </a>
              </li>
              <li>
                <a href="#download" className="hover:text-accent transition">
                  Downloads
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition">
                  Setup Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  Forums
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition">
                  License
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; 2025 Spirit Messenger. All rights reserved.</p>
          <p>Bringing back the classics, reimagined for today.</p>
        </div>
      </div>
    </footer>
  )
}
