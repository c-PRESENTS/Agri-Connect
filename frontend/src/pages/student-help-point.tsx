import { BookOpenCheck, GraduationCap, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const helpAreas = [
  { icon: BookOpenCheck, title: "Learning resources", text: "Guides for understanding marketplace basics and agricultural terms." },
  { icon: Lightbulb, title: "Project support", text: "A future space for student projects, field research, and practical ideas." },
  { icon: MessageCircleQuestion, title: "Ask for help", text: "Mentor and support workflows will appear here when service support is available." },
];

export default function StudentHelpPointPage() {
  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
    <div className="mb-6"><div className="flex items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold" data-testid="heading-student-help-point">Student Help Point</h1><Badge variant="secondary">Coming soon</Badge></div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">A safe foundation for student learning and future support tools. No academic records, messages, or requests are collected in this version.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{helpAreas.map(({ icon: Icon, title, text }) => <Card key={title} data-testid={`student-help-${title.toLowerCase().replace(/\s+/g, "-")}`}><CardContent className="p-5"><Icon className="mb-3 h-6 w-6 text-primary" /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{text}</p><Badge variant="outline" className="mt-4">Foundation only</Badge></CardContent></Card>)}</div>
    <Card className="mt-6" data-testid="student-help-empty-state"><CardContent className="p-6 text-center"><h2 className="font-semibold">No help requests yet</h2><p className="mt-1 text-sm text-muted-foreground">Request and mentor features are not available yet.</p></CardContent></Card>
  </main></div>;
}
