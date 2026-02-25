"use client"

import { ScanSearch, Zap, BarChart3, FileJson, ShieldCheck, Code2 } from "lucide-react"

const features = [
  {
    icon: ScanSearch,
    title: "Automated Detection",
    description:
      "AI algorithms automatically identify missing values, outliers, duplicates, and inconsistencies in your datasets.",
  },
  {
    icon: Zap,
    title: "Smart Cleaning",
    description:
      "Intelligent preprocessing that preserves data integrity while fixing quality issues using ML-based approaches.",
  },
  {
    icon: BarChart3,
    title: "Quality Reports",
    description:
      "Comprehensive data quality reports with visualizations and recommendations for further improvements.",
  },
  {
    icon: FileJson,
    title: "Multiple Formats",
    description:
      "Support for CSV, JSON, Parquet, and database connections with seamless integration into your workflow.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description: "SOC 2 compliant with end-to-end encryption. Your data never leaves your secure environment.",
  },
  {
    icon: Code2,
    title: "API Integration",
    description: "RESTful API and Python SDK for seamless integration into your existing ML pipelines and workflows.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 lg:py-36">
      {/* Subtle background treatment */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">Features</span>
          <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Everything You Need for{" "}
            <span className="instrument italic text-primary">Clean&nbsp;Data</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            Comprehensive data cleaning tools powered by AI to ensure your datasets are ready for production.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const delayClass = [
              "delay-100",
              "delay-200",
              "delay-300",
              "delay-400",
              "delay-500",
              "delay-600",
            ][index] ?? ""

            return (
              <div
                key={feature.title}
                className={`group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-up ${delayClass}`}
              >
                {/* Accent bar on hover */}
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
