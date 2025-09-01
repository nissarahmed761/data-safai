"use client"

import { useState } from "react"
import Link from "next/link"

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen)
    }

    return (
        <header className="relative z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
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
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-2">
                        <a
                            href="#features"
                            className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-all duration-200"
                        >
                            Features
                        </a>
                        <a
                            href="#cta"
                            className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-muted transition-all duration-200"
                        >
                            API
                        </a>
                    </nav>

                    {/* Desktop Buttons */}
                    <div className="hidden md:flex items-center space-x-3">
                        <Link 
                            href="/sign-in" 
                            className="group relative bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all duration-300 overflow-hidden min-w-[100px] text-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                            
                            <span className="relative z-10 block group-hover:hidden">Get Started</span>
                            <span className="relative z-10 hidden group-hover:block">Sign In</span>
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={toggleMenu}
                            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-all duration-200"
                            aria-label="Toggle menu"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {isMenuOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border">
                            <a
                                href="#features"
                                className="block text-muted-foreground hover:text-foreground text-sm font-medium px-3 py-2 rounded-md hover:bg-muted transition-all duration-200"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Features
                            </a>
                            <a
                                href="#cta"
                                className="block text-muted-foreground hover:text-foreground text-sm font-medium px-3 py-2 rounded-md hover:bg-muted transition-all duration-200"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                API
                            </a>
                            <div className="space-y-2">
                                <Link 
                                    href="/sign-in" 
                                    className="group relative w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-all duration-300 overflow-hidden"
                                >
                                    {/* Light effect overlay for mobile */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                                    
                                    {/* Text content for mobile */}
                                    <span className="relative z-10 block group-hover:hidden">Sign In</span>
                                    <span className="relative z-10 hidden group-hover:block">Get Started</span>
                                </Link>
                                <button className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all duration-200">
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
