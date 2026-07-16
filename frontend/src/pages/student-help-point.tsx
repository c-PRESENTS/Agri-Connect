import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, HelpCircle, Inbox, Loader2, RefreshCw, Search } from "lucide-react";
import { useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { StudentToolbar } from "@/components/student-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StudentResource, StudentSupportRequest } from "@shared/schema";

type StudentProfile = {
  studentNumber: string;
  institutionalEmail: string;
  studyLevel: "UG" | "PG" | "PhD";
  programme: string;
  department?: string | null;
  accessExpiresAt: string;
  demo?: boolean;
};

const categories = ["Academic support", "Fees and funding", "IT and account access", "Library and research", "Wellbeing", "Accessibility", "Careers", "International student support"];

function PageState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card><CardContent className="p-10 text-center"><p className="text-sm text-muted-foreground">{message}</p>{retry && <Button variant="outline" className="mt-4" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>}</CardContent></Card>;
}

export default function StudentHelpPointPage() {
  const [location, setLocation] = useLocation();
  const section = location.endsWith("/resources") ? "resources" : location.endsWith("/support") ? "support" : location.endsWith("/requests") ? "requests" : "dashboard";
  const profileQuery = useQuery<StudentProfile>({ queryKey: ["/api/student/profile"] });
  const resourcesQuery = useQuery<StudentResource[]>({ queryKey: ["/api/student/resources"] });
  const requestsQuery = useQuery<StudentSupportRequest[]>({ queryKey: ["/api/student/support-requests"] });
  const [search, setSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const [form, setForm] = useState({ category: categories[0], subject: "", description: "", preferredContact: "institutional_email", privacyAcknowledged: false });
  const [formError, setFormError] = useState("");
  const changeDemoLevel = useMutation({
    mutationFn: async (level: StudentProfile["studyLevel"]) => {
      const response = await apiRequest("POST", "/api/student-demo/level", { level });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/student/resources"] }),
      ]);
    },
  });

  const filteredResources = useMemo(() => (resourcesQuery.data || []).filter((resource) => {
    const matchesSearch = `${resource.title} ${resource.summary}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (resourceCategory === "all" || resource.category === resourceCategory);
  }), [resourceCategory, resourcesQuery.data, search]);

  const createRequest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/support-requests", form);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/support-requests"] });
      setForm({ category: categories[0], subject: "", description: "", preferredContact: "institutional_email", privacyAcknowledged: false });
      setLocation("/student/requests");
    },
    onError: (error: Error) => setFormError(error.message.replace(/^\d+:\s*/, "")),
  });

  if (profileQuery.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (profileQuery.isError || !profileQuery.data) return <PageState message="Unable to load your verified student profile." retry={() => profileQuery.refetch()} />;
  const profile = profileQuery.data;

  return <div className="min-h-screen bg-background"><TopNavigation /><StudentToolbar /><main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
    <header className="mb-6"><div className="flex flex-wrap items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Student Help Point</h1><Badge>{profile.studyLevel}</Badge>{profile.demo && <Badge variant="outline">Demo preview</Badge>}</div><p className="mt-2 text-sm text-muted-foreground">Support and published resources for {profile.programme}. Your marketplace role is unchanged.</p>{profile.demo && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p>Preview mode uses illustrative student data and temporary in-memory requests. Strict registry and email verification remain enforced in production.</p><fieldset className="mt-3"><legend className="font-semibold">Preview study level</legend><div className="mt-2 flex flex-wrap gap-2">{(["UG", "PG", "PhD"] as const).map((level) => <Button key={level} type="button" size="sm" variant={profile.studyLevel === level ? "default" : "outline"} disabled={changeDemoLevel.isPending} aria-pressed={profile.studyLevel === level} onClick={() => changeDemoLevel.mutate(level)}>{level}</Button>)}</div></fieldset></div>}</header>

    {section === "dashboard" && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><BookOpen className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{resourcesQuery.data?.length ?? 0}</p><p className="text-sm text-muted-foreground">Available resources</p></CardContent></Card><Card><CardContent className="p-5"><Inbox className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{requestsQuery.data?.length ?? 0}</p><p className="text-sm text-muted-foreground">My help requests</p></CardContent></Card><Card><CardContent className="p-5"><HelpCircle className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Need assistance?</p><Button className="mt-3" size="sm" onClick={() => setLocation("/student/support")}>Request help</Button></CardContent></Card></div><Card><CardHeader><CardTitle className="text-lg">{profile.demo ? "Student profile preview" : "Verified student profile"}</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Student number:</span> {profile.studentNumber}</p><p><span className="text-muted-foreground">Institutional email:</span> {profile.institutionalEmail}</p><p><span className="text-muted-foreground">Programme:</span> {profile.programme}</p><p><span className="text-muted-foreground">Department:</span> {profile.department || "Not specified"}</p></CardContent></Card></div>}

    {section === "resources" && <section aria-labelledby="resources-heading"><h2 id="resources-heading" className="text-xl font-semibold">Learning and support resources</h2><div className="my-4 grid gap-3 sm:grid-cols-[1fr_16rem]"><Label className="relative"><span className="sr-only">Search resources</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" /></Label><Label><span className="sr-only">Resource category</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={resourceCategory} onChange={(event) => setResourceCategory(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Label></div>{resourcesQuery.isLoading ? <PageState message="Loading student resources…" /> : resourcesQuery.isError ? <PageState message="Unable to load resources." retry={() => resourcesQuery.refetch()} /> : filteredResources.length === 0 ? <PageState message={resourcesQuery.data?.length ? "No resources match these filters." : "No published resources are available for your study level yet."} /> : <div className="grid gap-4 md:grid-cols-2">{filteredResources.map((resource) => <Card key={resource.id}><CardContent className="p-5"><Badge variant="outline">{resource.category}</Badge><h3 className="mt-3 font-semibold">{resource.title}</h3><p className="mt-2 text-sm text-muted-foreground">{resource.summary}</p><a href={resource.url} className="mt-4 inline-block text-sm font-medium text-primary underline" target={resource.url.startsWith("http") ? "_blank" : undefined} rel={resource.url.startsWith("http") ? "noreferrer" : undefined}>Open resource</a></CardContent></Card>)}</div>}</section>}

    {section === "support" && <section className="mx-auto max-w-2xl" aria-labelledby="support-heading"><h2 id="support-heading" className="text-xl font-semibold">Request student support</h2><p className="mt-1 text-sm text-muted-foreground">Urgent safety or medical concerns should be directed to your institution's published emergency contacts, not this form.</p><Card className="mt-4"><CardContent className="space-y-4 p-5"><Label>Category<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Label><Label>Subject<Input className="mt-1" value={form.subject} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></Label><Label>How can we help?<Textarea className="mt-1 min-h-32" value={form.description} maxLength={5000} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Label><Label>Preferred contact<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.preferredContact} onChange={(event) => setForm((current) => ({ ...current, preferredContact: event.target.value }))}><option value="institutional_email">Institutional email</option><option value="platform">Platform update</option></select></Label><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={form.privacyAcknowledged} onChange={(event) => setForm((current) => ({ ...current, privacyAcknowledged: event.target.checked }))} /><span>I understand this request will be stored for student-support purposes. I will not include passwords, payment details, or unnecessary sensitive information.</span></label>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<Button disabled={createRequest.isPending || !form.privacyAcknowledged} onClick={() => { setFormError(""); createRequest.mutate(); }}>{createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit request</Button></CardContent></Card></section>}

    {section === "requests" && <section aria-labelledby="requests-heading"><h2 id="requests-heading" className="text-xl font-semibold">My support requests</h2><div className="mt-4">{requestsQuery.isLoading ? <PageState message="Loading your requests…" /> : requestsQuery.isError ? <PageState message="Unable to load your requests." retry={() => requestsQuery.refetch()} /> : !requestsQuery.data?.length ? <PageState message="You have not submitted a student support request yet." /> : <div className="space-y-3">{requestsQuery.data.map((request) => <Card key={request.id}><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{request.subject}</h3><Badge variant="outline">{request.status.replace("_", " ")}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{request.category} · {new Date(request.createdAt).toLocaleDateString("en-GB")}</p><p className="mt-2 line-clamp-2 text-sm">{request.description}</p></div></CardContent></Card>)}</div>}</div></section>}
  </main></div>;
}
