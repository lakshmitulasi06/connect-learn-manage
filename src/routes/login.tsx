import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role: "admin" },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — signing in…");
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (!e2) navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
      <Card className="relative z-10 w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-6 w-6" />
          </Link>
          <CardTitle className="font-display text-2xl">EduPortal Admin</CardTitle>
          <CardDescription>Sign in or create the first admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">First account becomes admin automatically.</p>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
