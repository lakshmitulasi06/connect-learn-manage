import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Profile = { id: string; full_name: string | null; email: string | null; branch: string | null; year: number | null; profile_pic_url: string | null; role_hint: string | null };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

function ChatPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("branches").select("name").then(({ data }) => setBranches((data ?? []).map((b) => b.name)));
  }, []);

  useEffect(() => {
    let q = supabase.from("profiles").select("*").neq("id", user?.id ?? "");
    if (branch && branch !== "__all") q = q.eq("branch", branch);
    if (year && year !== "__all") q = q.eq("year", parseInt(year));
    q.order("full_name").then(({ data }) => setPeople((data ?? []) as Profile[]));
  }, [branch, year, user?.id]);

  useEffect(() => {
    if (!active || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
        .order("created_at");
      setMessages((data ?? []) as Msg[]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    load();
    const ch = supabase
      .channel(`chat:${user.id}:${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as Msg;
        if ((m.sender_id === user.id && m.recipient_id === active.id) || (m.sender_id === active.id && m.recipient_id === user.id)) {
          setMessages((prev) => [...prev, m]);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, user]);

  const send = async () => {
    if (!text.trim() || !active || !user) return;
    const body = text.trim();
    setText("");
    await supabase.from("chat_messages").insert({ sender_id: user.id, recipient_id: active.id, body });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold">WhatsApp Chat</h1>
        <p className="text-sm text-muted-foreground">Filter by branch & year, then start a real-time conversation.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">People</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {[1, 2, 3, 4].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-1 overflow-auto p-2">
            {people.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No people match</div>}
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-muted ${active?.id === p.id ? "bg-muted" : ""}`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.profile_pic_url ?? undefined} />
                  <AvatarFallback>{(p.full_name ?? p.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.full_name ?? p.email}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.role_hint} · {p.branch ?? "-"} {p.year ? `· Y${p.year}` : ""}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex h-[70vh] flex-col shadow-soft">
          {active ? (
            <>
              <CardHeader className="flex flex-row items-center gap-3 border-b">
                <Avatar><AvatarImage src={active.profile_pic_url ?? undefined} /><AvatarFallback>{(active.full_name ?? "?").charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <div className="font-medium">{active.full_name ?? active.email}</div>
                  <div className="text-xs text-muted-foreground">{active.role_hint} · {active.branch ?? "-"} {active.year ? `· Year ${active.year}` : ""}</div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-2 p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-soft ${m.sender_id === user?.id ? "bg-gradient-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.body}
                      <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </CardContent>
              <div className="flex gap-2 border-t p-3">
                <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
                <Button onClick={send}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a person to start chatting</div>
          )}
        </Card>
      </div>
    </div>
  );
}
