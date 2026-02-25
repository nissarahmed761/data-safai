"use client"

import { useState } from "react"
import Link from "next/link"
import { UserButton, useUser } from "@clerk/nextjs"
import { Sparkles } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { isSignedIn, user } = useUser()

    return (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="group flex items-center gap-2.5">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">
                            Data <span className="text-primary">Safai</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        <a
                            href="#features"
                            className="relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground rounded-lg hover:bg-muted/60"
                        >
                            Features
                        </a>
                        <a
                            href="#cta"
                            className="relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground rounded-lg hover:bg-muted/60"
                        >
                            API
                        </a>
                    </nav>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        <ThemeToggle />
                        {isSignedIn ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
                                >
                                    Dashboard
                                </Link>
                                <UserButton
                                    appearance={{
                                        elements: {
                                            userButtonAvatarBox: "w-8 h-8 ring-2 ring-border",
                                            userButtonPopoverCard: "bg-background border-border shadow-xl",
                                            userButtonPopoverActionButton: "text-foreground hover:bg-muted",
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <Link
                                href="/sign-in"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
                            >
                                Get Started
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Toggle menu"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg animate-fade-in">
                    <div className="mx-auto max-w-7xl px-6 py-4 space-y-1">
                        <a
                            href="#features"
                            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Features
                        </a>
                        <a
                            href="#cta"
                            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            API
                        </a>
                        <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-muted-foreground">Theme</span>
                            <ThemeToggle />
                        </div>
                        <div className="pt-3 border-t border-border/50">
                            {isSignedIn ? (
                                <div className="space-y-2">
                                    <Link
                                        href="/dashboard"
                                        className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 text-center"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <span className="text-sm text-muted-foreground">
                                            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                                        </span>
                                        <UserButton
                                            appearance={{
                                                elements: {
                                                    userButtonAvatarBox: "w-8 h-8",
                                                    userButtonPopoverCard: "bg-background border-border",
                                                    userButtonPopoverActionButton: "text-foreground hover:bg-muted",
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href="/sign-in"
                                    className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 text-center"
                                >
                                    Get Started
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
