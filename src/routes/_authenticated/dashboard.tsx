import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Wallet, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="shadow-soft transition hover:shadow-elegant">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ students: 0, faculty: 0, lowAtt: 0, overdue: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: students }, { count: faculty }, { count: overdue }] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "faculty"),
        supabase.from("fees").select("*", { count: "exact", head: true }).lt("paid", 1).lt("due_date", new Date().toISOString().slice(0, 10)),
      ]);
      setStats({ students: students ?? 0, faculty: faculty ?? 0, lowAtt: 0, overdue: overdue ?? 0 });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Quick overview of campus activity.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={GraduationCap} label="Students" value={stats.students} />
        <Stat icon={Users} label="Faculty" value={stats.faculty} />
        <Stat icon={ClipboardCheck} label="Low attendance" value={stats.lowAtt} hint="< 75% (filter in Attendance)" />
        <Stat icon={Wallet} label="Fees overdue" value={stats.overdue} hint="Past due date" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display">Get started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use <strong>Attendance</strong> to filter by branch, year and date range, then print JVD / Non-JVD / Total reports.</p>
          <p>• Use <strong>Fees</strong> to add records, set due dates, and notify parents via WhatsApp or call.</p>
          <p>• Use <strong>Chat</strong> to message faculty or students in real time.</p>
        </CardContent>
      </Card>
    </div>
  );
}
