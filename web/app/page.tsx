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

const pipeline = [
  { label: "Draft", desc: "Author proposes a token or edit." },
  { label: "Change Request", desc: "Bundle changes for review." },
  { label: "Review", desc: "Approvers validate intent and impact." },
  { label: "Release", desc: "Immutable snapshot is taken." },
  { label: "Export", desc: "Deterministic artifacts ship downstream." },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Validated references",
    body: "{color.brand} resolves, cycles are caught, and type-aware checks run on every save, every approval, every import.",
  },
  {
    icon: Lock,
    title: "Immutable release snapshots",
    body: "Exports read from the snapshot the release was published with — never the live table. Builds stay reproducible.",
  },
  {
    icon: GitPullRequest,
    title: "Draft-first change requests",
    body: "New tokens flow draft → in-review → approved → published. Edits to live tokens stay visible until the release lands.",
  },
  {
    icon: Layers,
    title: "Workspace isolation",
    body: "Every entity is workspace-scoped and gated by Postgres RLS. RBAC is enforced server-side, not in the UI.",
  },
  {
    icon: Package,
    title: "Deterministic exports",
    body: "CSS, SCSS, TypeScript, and Style Dictionary JSON — sorted by name, stable formatting, exporter version stamped.",
  },
  {
    icon: Webhook,
    title: "Webhooks & audit trail",
    body: "HMAC-SHA256 signed webhooks, email relay, and an append-only audit log for every mutating action.",
  },
];

const faqs = [
  {
    q: "How is Tokene different from a token JSON file in Git?",
    a: "Tokens get validated, referenced, reviewed, and snapshotted as a unit. You get the same governance you expect from code review, plus deterministic exports your build trusts.",
  },
  {
    q: "What formats does it export?",
    a: "CSS custom properties, SCSS variables, a typed TypeScript module, and Style Dictionary–compatible JSON. Each export is sorted and version-stamped so diffs are clean.",
  },
  {
    q: "Can multiple teams share one instance?",
    a: "Yes. Every table is workspace-scoped with Postgres row-level security. Members are invited per workspace with roles enforced at the database boundary.",
  },
  {
    q: "What happens when I publish a release?",
    a: "A workspace-scoped mutex is acquired, every published token is snapshotted, the reference graph is refreshed, and open change requests are re-validated against the new state.",
  },
];

export default async function Home() {
  const authed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav authed={authed} />
      <Hero authed={authed} />
      <Pipeline />
      <Features />
      <ExportsSection />
      <Governance />
      <FAQ />
      <CTA authed={authed} />
      <Footer />
    </div>
  );
}

function Nav({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span>Tokene</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#exports" className="hover:text-foreground transition-colors">Exports</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {authed ? (
            <Button asChild size="sm">
              <Link href="/tokens">
                Open dashboard
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative overflow-hidden border-b">
      <GridBackdrop />
      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
          <Sparkles className="mr-1.5 h-3 w-3" />
          Design tokens, governed
        </Badge>
        <h1 className="mt-6 max-w-3xl text-balance text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          Ship design tokens with the same rigor as your code.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Tokene is a spec-driven platform for managing design tokens across design and engineering — with drafts,
          change requests, immutable releases, and deterministic exports your build can trust.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          {authed ? (
            <Button asChild size="lg">
              <Link href="/tokens">
                Open dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/signup">
                  Get started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          )}
        </div>

        <div className="mt-16 max-w-4xl">
          <TokenCard />
        </div>
      </div>
    </section>
  );
}

function TokenCard() {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-muted-foreground">
        <span className="font-mono">tokens / color.brand.500</span>
        <Badge variant="outline" className="rounded-full text-[10px] font-normal">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          published
        </Badge>
      </div>
      <div className="grid gap-6 px-5 py-6 md:grid-cols-[1fr_1fr_1fr]">
        <Field label="Name" value="color.brand.500" mono />
        <Field
          label="Value"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded border" style={{ background: "#2f6feb" }} />
              <span className="font-mono text-sm">#2f6feb</span>
            </span>
          }
        />
        <Field label="Type" value="color" mono />
        <Field label="Group" value="brand" mono />
        <Field label="References" value="—" />
        <Field label="Last release" value="v2026.04.18" mono />
      </div>
      <div className="border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
        Referenced by 14 tokens · 3 change requests since publish
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Pipeline() {
  return (
    <section id="workflow" className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>The product loop</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-medium tracking-tight md:text-4xl">
          Every token change flows through the same governed path.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Published tokens are never edited directly. A draft becomes a change request, gets reviewed, lands in a
          release, and is exported as an immutable snapshot.
        </p>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-5">
          {pipeline.map((stage, i) => (
            <li key={stage.label} className="bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-px w-6 bg-border" />
              </div>
              <div className="mt-4 text-base font-medium">{stage.label}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stage.desc}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>What you get</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-medium tracking-tight md:text-4xl">
          Built for teams that ship tokens to production.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card p-7">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/50">
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-5 text-base font-medium">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExportsSection() {
  return (
    <section id="exports" className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <SectionLabel>Exports</SectionLabel>
            <h2 className="mt-3 text-balance text-3xl font-medium tracking-tight md:text-4xl">
              One source, every format your build expects.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Each exporter is deterministic — tokens sorted by name, stable formatting, exporter version stamped in
              the output. Wire any of them into your bundler, CI, or design tooling.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "Read from immutable release snapshots, never live state",
                "Reproducible diffs across releases",
                "Stamped with exporter version for traceability",
                "Available via REST API or downloadable artifact",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-foreground/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pt-8">
            <ExportsPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function Governance() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionLabel>Governance</SectionLabel>
            <h2 className="mt-3 max-w-xl text-balance text-3xl font-medium tracking-tight md:text-4xl">
              Auditability across critical actions.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Every mutating action writes an audit row. Notifications fan out in-app and to your endpoints. Reviews
              capture intent and rationale, not just diffs.
            </p>
          </div>
          <div className="space-y-4">
            <Row icon={GitBranch} label="Breaking-change detection" desc="Edits flagged when values shift in ways that affect consumers." />
            <Row icon={Webhook} label="HMAC-signed webhooks" desc="Every external delivery includes x-tokene-signature." />
            <Row icon={ShieldCheck} label="Row-level security" desc="Workspace isolation enforced at the Postgres boundary." />
            <Row icon={CheckCircle2} label="Approval gates" desc="Stale CRs disabled automatically after a publish." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function FAQ() {
  return (
    <section id="faq" className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Frequently asked</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-medium tracking-tight md:text-4xl">
          The short answers.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2">
          {faqs.map(({ q, a }) => (
            <div key={q} className="bg-card p-7">
              <div className="text-base font-medium">{q}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ authed }: { authed: boolean }) {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-col items-start justify-between gap-8 rounded-2xl border bg-card p-10 md:flex-row md:items-center md:p-14">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-medium tracking-tight md:text-4xl">
              Bring rigor to your design tokens.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Create a workspace, invite your team, and run your first release in minutes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {authed ? (
              <Button asChild size="lg">
                <Link href="/tokens">
                  Open dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/signup">
                    Create workspace
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-medium text-foreground">Tokene</span>
          <Separator orientation="vertical" className="mx-3 h-4" />
          <span>© {new Date().getFullYear()} · Design tokens, governed.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
      <span className="h-px w-6 bg-border" />
      {children}
    </div>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background"
    >
      <span className="text-[11px] font-bold leading-none">T</span>
    </span>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    />
  );
}
