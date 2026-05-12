import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, MessageSquare, ClipboardCheck, Wallet, User as UserIcon, LayoutDashboard, GraduationCap } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "WhatsApp Chat", url: "/chat", icon: MessageSquare },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Fees Structure", url: "/fees", icon: Wallet },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-sidebar-foreground">EduPortal</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Admin Console</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <div className="mb-2 rounded-md bg-sidebar-accent px-2 py-2 text-xs text-sidebar-accent-foreground">
            <div className="truncate font-medium">{user.email}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">{role ?? "…"}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
