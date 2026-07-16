import { BookOpen, GraduationCap, HelpCircle, LayoutDashboard, ListChecks } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const links = [
  { href: "/student/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/student/resources", label: "Resources", Icon: BookOpen },
  { href: "/student/support", label: "Request help", Icon: HelpCircle },
  { href: "/student/requests", label: "My requests", Icon: ListChecks },
];

export function StudentToolbar() {
  const [location] = useLocation();
  return <nav aria-label="Student portal" className="border-b bg-card"><div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3"><div className="mr-2 flex shrink-0 items-center gap-2 font-semibold"><GraduationCap className="h-5 w-5 text-primary" />Student</div>{links.map(({ href, label, Icon }) => <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", location === href ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><Icon className="h-4 w-4" />{label}</Link>)}</div></nav>;
}
