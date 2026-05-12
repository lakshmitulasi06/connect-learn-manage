import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/attendance")({ component: AttendancePage });

type Row = {
  student_id: string;
  full_name: string | null;
  email: string | null;
  jvd: boolean | null;
  father_mobile: string | null;
  mother_mobile: string | null;
  total: number;
  present: number;
};

function AttendancePage() {
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<"total" | "jvd" | "non_jvd">("total");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("branches").select("name").then(({ data }) => setBranches((data ?? []).map((b) => b.name)));
  }, []);

  const fetchData = async () => {
    if (!branch || !year) return;
    setLoading(true);
    // Get student profiles in branch+year
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email, jvd, father_mobile, mother_mobile, role_hint")
      .eq("branch", branch)
      .eq("year", parseInt(year))
      .eq("role_hint", "student");

    const studentIds = (profs ?? []).map((p) => p.id);
    if (studentIds.length === 0) { setRows([]); setLoading(false); return; }

    const { data: att } = await supabase
      .from("attendance")
      .select("student_id, status")
      .gte("date", from)
      .lte("date", to)
      .in("student_id", studentIds);

    const map = new Map<string, { total: number; present: number }>();
    (att ?? []).forEach((a) => {
      const m = map.get(a.student_id) ?? { total: 0, present: 0 };
      m.total += 1;
      if (a.status === "P") m.present += 1;
      map.set(a.student_id, m);
    });

    const result: Row[] = (profs ?? []).map((p) => ({
      student_id: p.id,
      full_name: p.full_name,
      email: p.email,
      jvd: p.jvd,
      father_mobile: p.father_mobile,
      mother_mobile: p.mother_mobile,
      total: map.get(p.id)?.total ?? 0,
      present: map.get(p.id)?.present ?? 0,
    }));
    setRows(result);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (filter === "jvd") return rows.filter((r) => r.jvd === true);
    if (filter === "non_jvd") return rows.filter((r) => !r.jvd);
    return rows;
  }, [rows, filter]);

  const notifyLow = (r: Row) => {
    const pct = r.total ? Math.round((r.present / r.total) * 100) : 0;
    const phone = (r.father_mobile ?? r.mother_mobile ?? "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Dear Parent, ${r.full_name ?? "your ward"}'s attendance is ${pct}% (${r.present}/${r.total}) from ${from} to ${to}. Please ensure regular attendance. — EduPortal`);
    if (!phone) return alert("No parent number on file");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Filter, view, print and notify parents of low attendance.</p>
        </div>
        <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      <Card className="no-print shadow-soft">
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="jvd">JVD only</SelectItem>
                <SelectItem value="non_jvd">Non-JVD only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={fetchData} disabled={loading} className="w-full">{loading ? "Loading…" : "Apply"}</Button></div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display">
            Report — {branch || "—"} / Year {year || "—"} / {filter.toUpperCase()} ({from} → {to})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2 pr-2">Student</th><th>Email</th><th>JVD</th><th>Present</th><th>Total</th><th>%</th><th className="no-print">Action</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pct = r.total ? Math.round((r.present / r.total) * 100) : 0;
                  const low = r.total > 0 && pct < 75;
                  return (
                    <tr key={r.student_id} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.full_name ?? "—"}</td>
                      <td className="text-muted-foreground">{r.email}</td>
                      <td>{r.jvd ? "Yes" : "No"}</td>
                      <td>{r.present}</td>
                      <td>{r.total}</td>
                      <td className={low ? "font-bold text-destructive" : ""}>{pct}%</td>
                      <td className="no-print">
                        {low && (
                          <Button size="sm" variant="outline" onClick={() => notifyLow(r)}>
                            <MessageCircle className="mr-1 h-3 w-3" />WhatsApp parent
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No data. Apply filters above.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
