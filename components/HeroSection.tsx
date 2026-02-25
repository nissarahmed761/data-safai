'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Zap, ArrowRight, CheckCircle2, XCircle, Sparkles } from "lucide-react"

export default function HeroSection() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  return (
    <section className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-gentle" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 md:py-28 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="max-w-xl">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary ring-1 ring-primary/20">
                <Zap className="h-3.5 w-3.5" />
                AI-Powered Data Cleaning
              </span>
            </div>

            <h1 className="mt-6 animate-fade-up delay-100">
              <span className="block text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                Clean Your Data.
              </span>
              <span className="block text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mt-1">
                <span className="instrument text-primary italic">Accelerate</span>{" "}
                <span className="text-foreground">Your&nbsp;Workflow.</span>
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground animate-fade-up delay-200 text-pretty">
              Data Safai automatically detects and fixes data quality issues in your datasets, saving hours of manual preprocessing so you can focus on building better models.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
              <Button
                size="lg"
                className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 text-base shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                onClick={() => router.push(isSignedIn ? '/dashboard' : '/sign-up')}
              >
                {isSignedIn ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base border-border/80 hover:bg-muted/60"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                See How It Works
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground animate-fade-up delay-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                CSV &amp; JSON support
              </span>
            </div>
          </div>

          {/* Right — Visual data illustration */}
          <div className="relative hidden lg:block animate-slide-in-right delay-300">
            <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 bg-muted/40">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-chart-5/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                <span className="ml-3 text-xs font-medium text-muted-foreground tracking-wide">dataset_v2.csv</span>
              </div>

              {/* Fake data table */}
              <div className="p-4 space-y-0 text-xs font-mono">
                {/* Header */}
                <div className="grid grid-cols-4 gap-3 pb-2.5 border-b border-border/40 text-muted-foreground font-semibold">
                  <span>id</span>
                  <span>name</span>
                  <span>email</span>
                  <span>revenue</span>
                </div>

                {/* Clean row */}
                <div className="grid grid-cols-4 gap-3 py-2.5 border-b border-border/20 text-card-foreground">
                  <span>001</span>
                  <span>Arjun P.</span>
                  <span className="truncate">arjun@co.in</span>
                  <span>$12,400</span>
                </div>

                {/* Dirty row — highlighted */}
                <div className="grid grid-cols-4 gap-3 py-2.5 border-b border-border/20 bg-destructive/5 rounded-md px-1 -mx-1 relative">
                  <span className="text-card-foreground">002</span>
                  <span className="text-destructive line-through">NaN</span>
                  <span className="text-destructive truncate line-through">not-an-email</span>
                  <span className="text-card-foreground">$8,200</span>
                  <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive/70" />
                </div>

                {/* Fixed row — resolved */}
                <div className="grid grid-cols-4 gap-3 py-2.5 border-b border-border/20 bg-primary/5 rounded-md px-1 -mx-1 relative">
                  <span className="text-card-foreground">002</span>
                  <span className="text-primary font-medium">Priya S.</span>
                  <span className="text-primary truncate font-medium">priya@co.in</span>
                  <span className="text-card-foreground">$8,200</span>
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/70" />
                </div>

                {/* Clean row */}
                <div className="grid grid-cols-4 gap-3 py-2.5 border-b border-border/20 text-card-foreground">
                  <span>003</span>
                  <span>Mei L.</span>
                  <span className="truncate">mei@lab.io</span>
                  <span>$19,750</span>
                </div>

                {/* Dirty row */}
                <div className="grid grid-cols-4 gap-3 py-2.5 border-b border-border/20 bg-destructive/5 rounded-md px-1 -mx-1 relative">
                  <span className="text-card-foreground">004</span>
                  <span className="text-card-foreground">Sam K.</span>
                  <span className="truncate text-card-foreground">sam@dev.co</span>
                  <span className="text-destructive line-through">NULL</span>
                  <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive/70" />
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5 bg-muted/30">
                <span className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  2 issues detected &middot; cleaning...
                </span>
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-primary transition-all duration-1000" />
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 rounded-xl border border-border/60 bg-background shadow-lg px-4 py-3 animate-float">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">98.7% Clean</p>
                  <p className="text-xs text-muted-foreground">Quality score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
