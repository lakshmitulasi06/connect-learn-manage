import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ShieldCheck, MessageSquare, ClipboardCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="font-display text-lg font-bold">EduPortal <span className="text-accent">Admin</span></div>
        </div>
        <Button asChild variant="default">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground shadow-soft backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Admin & Faculty Console
        </div>
        <h1 className="mt-6 font-display text-5xl font-bold tracking-tight md:text-6xl">
          Run your campus. <span className="bg-gradient-primary bg-clip-text text-transparent">Beautifully.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Manage attendance, fees, profiles and real-time chat across branches and years — one polished console for administrators.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Open Console</Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-4">
        {[
          { icon: Users, t: "Profiles", d: "Manage students, faculty & admins by branch and year." },
          { icon: MessageSquare, t: "Realtime Chat", d: "1-to-1 conversations across the campus." },
          { icon: ClipboardCheck, t: "Attendance", d: "Print JVD / Non-JVD / Total reports any date range." },
          { icon: Wallet, t: "Fees", d: "Track dues, remind parents via WhatsApp & call." },
        ].map((f) => (
          <div key={f.t} className="rounded-xl border border-border bg-card p-5 shadow-soft transition hover:shadow-elegant">
            <f.icon className="h-5 w-5 text-accent" />
            <div className="mt-3 font-display font-semibold">{f.t}</div>
            <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
