import type { ReactNode } from "react";
import { ExternalLink, Leaf, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useAuth } from "@/hooks/use-auth";
import { adminRouteLabel, visibleAdminNavigation } from "@/lib/admin-navigation";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const access = useAdminAccess();
  const { user, logout } = useAuth();
  const navigation = visibleAdminNavigation(access.data?.permissions ?? []);
  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Admin employee";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="offcanvas" data-testid="admin-sidebar">
        <SidebarHeader className="border-b p-4">
          <Link href="/admin/overview" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">AgriConnect</span>
              <span className="block truncate text-xs text-muted-foreground">Organisation Portal</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.startsWith(item.path)}
                      tooltip={item.label}
                      data-testid={`admin-nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      <Link href={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-3">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/15 text-xs font-black text-primary">{initials || "A"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{displayName}</p>
              <Badge variant="secondary" className="mt-1 max-w-full truncate text-[10px]">
                {access.data?.role?.name || "Organisation member"}
              </Badge>
            </div>
          </div>
          <Button className="mt-2 w-full justify-start" variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-muted/20">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <SidebarTrigger data-testid="admin-sidebar-trigger" />
          <div className="h-6 w-px bg-border" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <span className="text-muted-foreground">Organisation Portal</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:list-item" />
              <BreadcrumbItem>
                <BreadcrumbPage>{adminRouteLabel(location)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="hidden items-center gap-2 lg:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="max-w-48 truncate text-sm font-semibold">{access.data?.organisation?.name}</span>
            <Badge variant="outline">{access.data?.role?.name}</Badge>
          </div>
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <Link href="/">
              Public site <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </header>
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
