"use client"

export default function Navbar() {
  return (
    <header className="relative z-20 flex items-center justify-between p-6 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold text-foreground">Data Safai</span>
        </div>
      </div>

      <nav className="flex items-center space-x-2">
        <a
          href="#features"
          className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-all duration-200"
        >
          Features
        </a>
        <a
          href="#pricing"
          className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-all duration-200"
        >
          Pricing
        </a>
        <a
          href="#docs"
          className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-all duration-200"
        >
          Docs
        </a>
      </nav>

      <div className="flex items-center space-x-3">
        <button className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-md hover:bg-muted transition-all duration-200">
          Sign In
        </button>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all duration-200">
          Get Started
        </button>
      </div>
    </header>
  )
}
