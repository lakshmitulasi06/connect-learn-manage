import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, MessageCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fees")({ component: FeesPage });

type Student = { id: string; full_name: string | null; email: string | null; father_mobile: string | null; mother_mobile: string | null; branch: string | null; year: number | null };
type Fee = { id: string; student_id: string; amount: number; paid: number; due_date: string | null; note: string | null };

function FeesPage() {
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Record<string, Fee[]>>({});
  const [open, setOpen] = useState(false);
  const [selStudent, setSelStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    supabase.from("branches").select("name").then(({ data }) => setBranches((data ?? []).map((b) => b.name)));
  }, []);

  const load = async () => {
    if (!branch || !year) return;
    const { data: st } = await supabase
      .from("profiles")
      .select("id, full_name, email, father_mobile, mother_mobile, branch, year, role_hint")
      .eq("branch", branch).eq("year", parseInt(year)).eq("role_hint", "student");
    const ids = (st ?? []).map((s) => s.id);
    setStudents((st ?? []) as Student[]);
    if (ids.length) {
      const { data: f } = await supabase.from("fees").select("*").in("student_id", ids);
      const map: Record<string, Fee[]> = {};
      (f ?? []).forEach((row) => { (map[row.student_id] ??= []).push(row as Fee); });
      setFees(map);
    } else setFees({});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [branch, year]);

  const addFee = async () => {
    if (!selStudent || !amount) return;
    const { error } = await supabase.from("fees").insert({
      student_id: selStudent.id,
      amount: parseFloat(amount),
      paid: parseFloat(paid || "0"),
      due_date: dueDate || null,
      note: note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Fee record added");
    setOpen(false); setAmount(""); setPaid("0"); setDueDate(""); setNote("");
    load();
  };

  const callParent = (s: Student) => {
    const phone = (s.father_mobile ?? s.mother_mobile ?? "").replace(/\D/g, "");
    if (!phone) return toast.error("No parent number on file");
    window.location.href = `tel:${phone}`;
  };

  const whatsappParent = (s: Student, balance: number, due: string | null) => {
    const phone = (s.father_mobile ?? s.mother_mobile ?? "").replace(/\D/g, "");
    if (!phone) return toast.error("No parent number on file");
    const msg = encodeURIComponent(`Dear Parent, this is a reminder regarding pending fees for ${s.full_name ?? "your ward"}: balance ₹${balance}${due ? `, due by ${due}` : ""}. Kindly clear at the earliest. — EduPortal`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Fees Structure</h1>
        <p className="text-sm text-muted-foreground">Add fee records, track dues, and remind parents.</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Filter students</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
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
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="font-display">Students & balances</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2 pr-2">Student</th><th>Total</th><th>Paid</th><th>Balance</th><th>Earliest due</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const list = fees[s.id] ?? [];
                  const total = list.reduce((a, b) => a + Number(b.amount), 0);
                  const paidSum = list.reduce((a, b) => a + Number(b.paid), 0);
                  const bal = total - paidSum;
                  const dues = list.map((f) => f.due_date).filter(Boolean).sort() as string[];
                  const overdue = dues[0] && dues[0] < new Date().toISOString().slice(0, 10) && bal > 0;
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{s.full_name ?? s.email}</td>
                      <td>₹{total.toFixed(2)}</td>
                      <td>₹{paidSum.toFixed(2)}</td>
                      <td className={bal > 0 ? "font-semibold text-destructive" : "text-success"}>₹{bal.toFixed(2)}</td>
                      <td className={overdue ? "font-semibold text-destructive" : ""}>{dues[0] ?? "—"}</td>
                      <td className="space-x-1">
                        <Button size="sm" variant="outline" onClick={() => { setSelStudent(s); setOpen(true); }}>
                          <Plus className="mr-1 h-3 w-3" />Add
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => callParent(s)}>
                          <Phone className="mr-1 h-3 w-3" />Call
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => whatsappParent(s, bal, dues[0] ?? null)}>
                          <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No students. Pick branch & year.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add fee — {selStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Paid (₹)</Label><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tuition / Bus / Hostel…" /></div>
            <Button onClick={addFee} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
