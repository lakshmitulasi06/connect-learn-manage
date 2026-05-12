import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", mobile: "", branch: "", profile_pic_url: "",
  });

  useEffect(() => {
    supabase.from("branches").select("name").then(({ data }) => setBranches((data ?? []).map((b) => b.name)));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name ?? "",
        email: data.email ?? user.email ?? "",
        mobile: data.mobile ?? "",
        branch: data.branch ?? "",
        profile_pic_url: data.profile_pic_url ?? "",
      });
    });
  }, [user]);

  const upload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, profile_pic_url: data.publicUrl + `?t=${Date.now()}` }));
    toast.success("Picture uploaded");
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      email: form.email,
      mobile: form.mobile,
      branch: form.branch || null,
      profile_pic_url: form.profile_pic_url || null,
    }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Edit your details and profile picture.</p>
      </div>
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base">Your info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 shadow-soft">
              <AvatarImage src={form.profile_pic_url} />
              <AvatarFallback>{(form.full_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="pic" className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> Upload picture
                </span>
                <input id="pic" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </Label>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={save} disabled={loading} className="w-full">{loading ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
