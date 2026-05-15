import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  Layers,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ExportsPreview } from "@/components/marketing/exports-preview";
import { StaggerHeadline } from "@/components/marketing/headline";
import { LiveToken } from "@/components/marketing/live-token";
import { Pipeline } from "@/components/marketing/pipeline";
import { Reveal } from "@/components/marketing/reveal";
import { SectionRail } from "@/components/marketing/section-rail";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { StickyNav } from "@/components/marketing/sticky-nav";
import { TokenMarquee } from "@/components/marketing/token-marquee";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function isAuthenticated() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return false;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

const features = [
  {
    icon: ShieldCheck,
    title: "Validated references",
    body: "`{color.brand}` resolves recursively. Cycles are caught. Type-aware checks on every save, approval, and import.",
  },
  {
    icon: Lock,
    title: "Immutable snapshots",
    body: "Exports read from the snapshot the release was published with — never live state. Builds stay reproducible.",
  },
  {
    icon: GitPullRequest,
    title: "Draft-first changes",
    body: "Drafts flow draft → in-review → approved → published. Live values stay visible until the release lands.",
  },
  {
    icon: Layers,
    title: "Workspace isolation",
    body: "Every entity is workspace-scoped and gated by Postgres RLS. RBAC enforced at the database boundary.",
  },
  {
    icon: Package,
    title: "Deterministic exports",
    body: "CSS, SCSS, TypeScript, Style Dictionary. Sorted by name, stable formatting, version stamped.",
  },
  {
    icon: Webhook,
    title: "Signed webhooks",
    body: "HMAC-SHA256 signed deliveries and an email relay. Every external endpoint is in your control.",
  },
];

const faqs = [
  {
    q: "How is this different from a token JSON file in Git?",
    a: "Tokens get validated, referenced, reviewed, and snapshotted as a unit. The same governance you expect from code review, plus deterministic exports your build trusts.",
  },
  {
    q: "What formats does it export?",
    a: "CSS custom properties, SCSS variables, a typed TypeScript module, and Style Dictionary–compatible JSON. Each export is sorted and version-stamped so diffs stay clean.",
  },
  {
    q: "Can multiple teams share one instance?",
    a: "Yes. Every table is workspace-scoped with Postgres row-level security. Members are invited per workspace with roles enforced at the database boundary.",
  },
  {
    q: "What happens when I publish?",
    a: "A workspace-scoped mutex is acquired, published tokens are snapshotted, the reference graph is refreshed, and open change requests are re-validated against the new state.",
  },
];

export default async function Home() {
  const authed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <StickyNav authed={authed} />
      <SectionRail />

      <Hero authed={authed} />

      <section id="workflow" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <Reveal>
            <Eyebrow n="02" label="The product loop" />
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-5xl">
              Every token change flows through the same governed path.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              Published tokens are never edited directly. A draft becomes a change request, gets reviewed, lands in a
              release, and is exported as an immutable snapshot.
            </p>
          </Reveal>

          <div className="mt-16">
            <Pipeline />
          </div>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Reveal>
                <Eyebrow n="03" label="What you get" />
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-5 text-balance text-4xl font-medium tracking-tight md:text-5xl">
                  Built for teams that ship tokens to production.
                </h2>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 leading-relaxed text-muted-foreground">
                  A small set of opinions, applied consistently: validate early, snapshot on publish, export
                  deterministically, audit everything.
                </p>
              </Reveal>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {features.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <SpotlightCard className="h-full p-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mt-5 text-base font-medium">{title}</div>
                    <div
                      className="mt-2 text-sm leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: body.replace(
                          /`([^`]+)`/g,
                          '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground/85">$1</code>',
                        ),
                      }}
                    />
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="exports" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-16">
            <div>
              <Reveal>
                <Eyebrow n="04" label="Exports" />
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-5 text-balance text-4xl font-medium tracking-tight md:text-5xl">
                  One source. Every format your build expects.
                </h2>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 leading-relaxed text-muted-foreground">
                  Each exporter is deterministic — tokens sorted by name, stable formatting, exporter version stamped.
                </p>
              </Reveal>
              <Reveal delay={200}>
                <ul className="mt-8 space-y-3 text-sm">
                  {[
                    "Reads from immutable release snapshots",
                    "Reproducible diffs across releases",
                    "Available via REST API or downloadable artifact",
                    "Webhook-driven CI integration",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <ExportsPreview />
            </Reveal>
          </div>
        </div>
      </section>

      <section id="governance" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <Reveal>
                <Eyebrow n="05" label="Governance" />
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-5 text-balance text-4xl font-medium tracking-tight md:text-5xl">
                  Auditability across every critical action.
                </h2>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 leading-relaxed text-muted-foreground">
                  Every mutating action writes an audit row. Notifications fan out in-app and to your endpoints.
                  Reviews capture intent and rationale, not just diffs.
                </p>
              </Reveal>
            </div>
            <div className="space-y-3">
              {[
                { icon: GitBranch,    label: "Breaking-change detection", desc: "Edits flagged when values shift in ways that affect consumers." },
                { icon: Webhook,      label: "HMAC-signed webhooks",      desc: "Every external delivery includes x-tokene-signature." },
                { icon: ShieldCheck,  label: "Row-level security",        desc: "Workspace isolation at the Postgres boundary." },
                { icon: CheckCircle2, label: "Approval gates",            desc: "Stale CRs disabled automatically after a publish." },
              ].map((row, i) => (
                <Reveal key={row.label} delay={i * 70}>
                  <div className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all duration-300 hover:border-foreground/20 hover:shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background transition-transform duration-300 group-hover:-translate-y-0.5">
                      <row.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{row.label}</div>
                      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {row.desc}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <Reveal>
            <Eyebrow n="06" label="Frequently asked" />
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 max-w-2xl text-balance text-4xl font-medium tracking-tight md:text-5xl">
              The short answers.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2">
            {faqs.map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 60}>
                <div className="h-full bg-card p-7">
                  <div className="text-base font-medium">{q}</div>
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border bg-card p-10 md:p-16">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "radial-gradient(700px circle at 100% 0%, color-mix(in oklab, var(--foreground) 6%, transparent), transparent 50%)",
                }}
              />
              <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
                <div className="max-w-xl">
                  <Eyebrow n="07" label="Start" />
                  <h2 className="mt-5 text-balance text-4xl font-medium tracking-tight md:text-5xl">
                    Bring rigor to your design tokens.
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Create a workspace, invite your team, and run your first release in minutes.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {authed ? (
                    <Button asChild size="lg" className="press">
                      <Link href="/tokens">
                        Open dashboard
                        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg" className="press group">
                        <Link href="/signup">
                          Create workspace
                          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="outline" className="press">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section id="intro" className="relative overflow-hidden">
      <GridBackdrop />
      <TokenMarquee />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-20 md:py-28 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-12">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs"
            style={{ animation: "value-in 600ms var(--ease-out-expo) both" }}
          >
            <Sparkles className="h-3 w-3" />
            <span className="text-muted-foreground">Design tokens, governed</span>
          </div>

          <StaggerHeadline
            text="Ship design tokens with the rigor of code."
            className="mt-7 max-w-3xl text-balance text-5xl font-medium leading-[1.02] tracking-tight md:text-[68px]"
          />

          <p
            className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
            style={{ animation: "value-in 720ms var(--ease-out-expo) 480ms both" }}
          >
            Tokene is a spec-driven platform for design tokens — drafts, change requests, immutable releases, and
            deterministic exports your build can trust.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-3"
            style={{ animation: "value-in 720ms var(--ease-out-expo) 620ms both" }}
          >
            {authed ? (
              <Button asChild size="lg" className="press group">
                <Link href="/tokens">
                  Open dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="press group">
                  <Link href="/signup">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="press">
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
            <Badge variant="outline" className="ml-1 rounded-full font-mono text-[10px]">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              v2026.05.15
            </Badge>
          </div>
        </div>

        <div
          style={{ animation: "value-in 900ms var(--ease-out-expo) 360ms both" }}
        >
          <LiveToken />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background"
          >
            <span className="text-[11px] font-bold leading-none">T</span>
          </span>
          <span className="font-medium text-foreground">Tokene</span>
          <Separator orientation="vertical" className="mx-2 h-4" />
          <span>© {new Date().getFullYear()} · Design tokens, governed.</span>
        </div>
        <div className="flex items-center gap-7">
          <a href="#workflow" className="link-underline hover:text-foreground">Workflow</a>
          <a href="#features" className="link-underline hover:text-foreground">Features</a>
          <a href="#exports"  className="link-underline hover:text-foreground">Exports</a>
          <Link href="/login" className="link-underline hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

function Eyebrow({ n, label }: { n: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
      <span className="font-mono">{n}</span>
      <span className="h-px w-8 bg-border" />
      <span>{label}</span>
    </div>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 60%, transparent) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    />
  );
}
