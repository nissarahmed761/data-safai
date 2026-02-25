"use client"

import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import {
  ArrowRight,
  Upload,
  ScanSearch,
  WandSparkles,
  Download,
  ChevronRight,
} from "lucide-react"

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Upload Dataset",
    description: "Drag & drop your CSV or JSON file — or connect via API. We handle datasets up to 500 MB.",
    visual: (
      <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-2 text-xs text-muted-foreground">dataset.csv &middot; 24 MB</p>
        <div className="mt-3 mx-auto h-1.5 w-full max-w-32 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full rounded-full bg-primary" />
        </div>
      </div>
    ),
  },
  {
    num: "02",
    icon: ScanSearch,
    title: "AI Scans for Issues",
    description: "Our models detect missing values, duplicates, outliers, type mismatches, and formatting errors.",
    visual: (
      <div className="mt-5 space-y-2 text-xs font-mono">
        {[
          { label: "Missing values", count: 47, color: "text-destructive" },
          { label: "Duplicates", count: 12, color: "text-chart-5" },
          { label: "Type errors", count: 8, color: "text-chart-4" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={`font-semibold ${item.color}`}>{item.count} found</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "03",
    icon: WandSparkles,
    title: "Review & Fix",
    description: "Accept AI suggestions one-by-one or auto-apply all fixes. Full control, zero guesswork.",
    visual: (
      <div className="mt-5 space-y-2 text-xs font-mono">
        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive/60" />
          <span className="text-muted-foreground line-through flex-1">revenue: NULL</span>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="h-3.5 w-3.5 text-primary rotate-90" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/60" />
          <span className="text-primary font-medium flex-1">revenue: $14,200</span>
        </div>
      </div>
    ),
  },
  {
    num: "04",
    icon: Download,
    title: "Export Clean Data",
    description: "Download your production-ready dataset or push it directly to your pipeline via the SDK.",
    visual: (
      <div className="mt-5 rounded-xl border border-border/60 bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">dataset_clean.csv</p>
            <p className="text-xs text-muted-foreground">24.1 MB &middot; 98.7% quality</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: "98.7%" }} />
        </div>
      </div>
    ),
  },
]

export default function CTASection() {
  const { isSignedIn } = useUser()

  return (
    <section id="cta" className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">How It Works</span>
          <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            From Messy to{" "}
            <span className="instrument italic text-primary">Production-Ready</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            Four steps. That&apos;s all it takes to go from raw data to a clean, validated dataset.
          </p>
        </div>

        {/* Workflow steps */}
        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const delayClass = ["delay-100", "delay-200", "delay-300", "delay-400"][index] ?? ""

            return (
              <div
                key={step.num}
                className={`group relative animate-fade-up ${delayClass}`}
              >
                {/* Connector line (not on last) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-8 z-10">
                    <div className="h-px w-full bg-gradient-to-r from-border to-border/0" />
                    <ChevronRight className="absolute -right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-border" />
                  </div>
                )}

                <div className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col">
                  {/* Step number + icon row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-muted-foreground/50 uppercase">
                      Step {step.num}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>

                  {/* Mini visual */}
                  <div className="mt-auto">
                    {step.visual}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Lean CTA */}
        <div className="mt-20 text-center animate-fade-up delay-500">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 text-base shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/sign-in">
                <Button
                  size="lg"
                  className="group bg-primary hover:bg-primary/90 text-primary-foreground px-8 text-base shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  Try It Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required &middot; Clean your first dataset in under 2 minutes
          </p>
        </div>
      </div>
    </section>
  )
}