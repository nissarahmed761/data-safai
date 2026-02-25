"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Data <span className="text-primary">Safai</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              AI-powered data cleaning platform for data scientists and ML engineers. Ship cleaner models, faster.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Product</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#cta" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  API
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide">Support</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Help Center
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Data Safai. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
