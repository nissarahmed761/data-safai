"use client"

import { Button } from "@/components/ui/button"
import { SignInButton, useUser } from "@clerk/nextjs"
import Link from "next/link"

export default function CTASection() {
  const { isSignedIn } = useUser()

  return (
    <section className="py-24 px-6 bg-primary/5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Ready to Clean Your Data?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of data scientists who trust Data Safai to prepare their datasets for machine learning success.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base">
                Go to Dashboard
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base">
                  Sign In to Continue
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </SignInButton>
              <Link href="/sign-up">
                <Button size="lg" variant="outline" className="px-8 py-3 text-base">
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}