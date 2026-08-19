import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, HelpCircle, Inbox, Loader2, RefreshCw, Search } from "lucide-react";
import { useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { StudentToolbar } from "@/components/student-toolbar";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
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
const mvpDemoProfile: StudentProfile = {
  studentNumber: "MVP-DEMO",
  institutionalEmail: "student.preview@agriconnect.edu",
  studyLevel: "UG",
  programme: "AgriConnect Student Help Point Preview",
  department: "Student Support",
  accessExpiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  demo: true,
};
const mvpDemoResources: StudentResource[] = [
  {
    id: "mvp-demo-academic-support",
    title: "Academic skills and study planning",
    summary: "Study planning, assessment preparation, academic writing, and practical learning support.",
    url: "/farmers-help/student/support",
    category: "Academic support",
    studyLevels: ["UG", "PG", "PhD"],
    published: true,
    sortOrder: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "mvp-demo-library-research",
    title: "Library and research guidance",
    summary: "Support for literature searches, referencing, datasets, journals, and research consultations.",
    url: "/farmers-help/student/support",
    category: "Library and research",
    studyLevels: ["UG", "PG", "PhD"],
    published: true,
    sortOrder: 2,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "mvp-demo-wellbeing",
    title: "Wellbeing and accessibility support",
    summary: "A single place for wellbeing, accessibility, and student-support service requests.",
    url: "/farmers-help/student/support",
    category: "Wellbeing",
    studyLevels: ["UG", "PG", "PhD"],
    published: true,
    sortOrder: 3,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

function PageState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card><CardContent className="p-10 text-center"><p className="text-sm text-muted-foreground">{message}</p>{retry && <Button variant="outline" className="mt-4" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>}</CardContent></Card>;
}

export default function StudentHelpPointPage() {
  const [location, setLocation] = useLocation();
  const section = location.endsWith("/resources") ? "resources" : location.endsWith("/support") ? "support" : location.endsWith("/requests") ? "requests" : "dashboard";
  const profileQuery = useQuery<StudentProfile>({ queryKey: ["/api/student/profile"] });
  const resourcesQuery = useQuery<StudentResource[]>({ queryKey: ["/api/student/resources"] });
  const requestsQuery = useQuery<StudentSupportRequest[]>({ queryKey: ["/api/student/support-requests"] });
  const [demoRequests, setDemoRequests] = useState<StudentSupportRequest[]>([]);
  const [search, setSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const [form, setForm] = useState({ category: categories[0], subject: "", description: "", preferredContact: "institutional_email", privacyAcknowledged: false });
  const [formError, setFormError] = useState("");
  const profile = profileQuery.data ?? mvpDemoProfile;
  const isMvpDemoAccess = !profileQuery.data || profile.demo;
  const resources = resourcesQuery.data?.length ? resourcesQuery.data : mvpDemoResources;
  const requests = requestsQuery.data ?? demoRequests;
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

  const filteredResources = useMemo(() => resources.filter((resource) => {
    const matchesSearch = `${resource.title} ${resource.summary}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (resourceCategory === "all" || resource.category === resourceCategory);
  }), [resourceCategory, resources, search]);

  const createRequest = useMutation({
    mutationFn: async () => {
      if (isMvpDemoAccess) {
        const now = new Date();
        return {
          id: `mvp-demo-request-${now.getTime()}`,
          studentUserId: "mvp-demo-student",
          category: form.category,
          subject: form.subject.trim(),
          description: form.description.trim(),
          preferredContact: form.preferredContact,
          status: "submitted",
          createdAt: now,
          updatedAt: now,
          resolvedAt: null,
        } satisfies StudentSupportRequest;
      }
      const response = await apiRequest("POST", "/api/student/support-requests", form);
      return response.json();
    },
    onSuccess: (request) => {
      if (isMvpDemoAccess) {
        setDemoRequests((current) => [request, ...current]);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/student/support-requests"] });
      }
      setForm({ category: categories[0], subject: "", description: "", preferredContact: "institutional_email", privacyAcknowledged: false });
      setLocation("/farmers-help/student/requests");
    },
    onError: (error: Error) => setFormError(error.message.replace(/^\d+:\s*/, "")),
  });

  return <div className="min-h-screen bg-background"><TopNavigation /><StudentToolbar /><main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <GraduationCap className="h-9 w-9 sm:h-11 sm:w-11 text-primary flex-shrink-0" />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">Student Help Point</h1>
        <ComingSoonBadge />
        <Badge className="text-xs sm:text-sm font-black px-3 py-1 bg-primary text-primary-foreground">{profile.studyLevel}</Badge>
        {isMvpDemoAccess && <Badge variant="outline" className="text-xs sm:text-sm font-black px-3 py-1 border-2 border-primary/40">Demo preview</Badge>}
      </div>
      <p className="mt-3 text-base sm:text-lg font-bold text-foreground/85">
        Support and published resources for {profile.programme}. Your marketplace role is unchanged.
      </p>
      {isMvpDemoAccess && (
        <div className="mt-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/40 p-5 sm:p-6 shadow-sm">
          <p className="text-sm sm:text-base md:text-lg font-bold text-amber-950 dark:text-amber-200 leading-relaxed">
            Preview mode uses illustrative student data and temporary in-memory requests. Strict registry and email verification remain enforced in production.
          </p>
          <fieldset className="mt-4 border-t border-amber-200 dark:border-amber-800 pt-3">
            <legend className="font-black text-base sm:text-lg uppercase tracking-wide text-amber-950 dark:text-amber-200">Preview study level</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["UG", "PG", "PhD"] as const).map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="default"
                  variant={profile.studyLevel === level ? "default" : "outline"}
                  disabled={changeDemoLevel.isPending}
                  aria-pressed={profile.studyLevel === level}
                  onClick={() => changeDemoLevel.mutate(level)}
                  className={`h-10 px-5 text-sm sm:text-base font-black uppercase tracking-wider border-2 shadow-xs ${profile.studyLevel === level ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : "border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200"}`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </header>

    {section === "dashboard" && (
      <div className="space-y-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="rounded-2xl border-2 border-border/70 shadow-md hover:shadow-xl transition-all">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-primary flex-shrink-0" />
                <p className="text-sm sm:text-base font-black uppercase tracking-wide text-foreground">Available resources</p>
              </div>
              <p className="mt-4 text-4xl sm:text-5xl font-black text-primary">{resources.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-border/70 shadow-md hover:shadow-xl transition-all">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <Inbox className="h-8 w-8 sm:h-10 sm:w-10 text-primary flex-shrink-0" />
                <p className="text-sm sm:text-base font-black uppercase tracking-wide text-foreground">My help requests</p>
              </div>
              <p className="mt-4 text-4xl sm:text-5xl font-black text-primary">{requests.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 shadow-md hover:shadow-xl transition-all">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-lg sm:text-xl font-black text-foreground uppercase tracking-wide">Need assistance?</p>
              </div>
              <Button
                className="mt-4 w-full h-11 px-6 text-sm sm:text-base font-black uppercase tracking-wide bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                onClick={() => setLocation("/farmers-help/student/support")}
              >
                Request help
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-2 border-primary/30 shadow-md p-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl sm:text-2xl font-black uppercase tracking-wider text-foreground">
              {isMvpDemoAccess ? "Student profile preview" : "Verified student profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 text-base sm:grid-cols-2 p-6 pt-2">
            <div className="p-3 rounded-xl border bg-muted/30">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground block mb-1">Student number:</span>
              <span className="text-base sm:text-lg font-black text-foreground">{profile.studentNumber}</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/30">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground block mb-1">Institutional email:</span>
              <span className="text-base sm:text-lg font-black text-foreground break-all">{profile.institutionalEmail}</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/30">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground block mb-1">Programme:</span>
              <span className="text-base sm:text-lg font-black text-foreground">{profile.programme}</span>
            </div>
            <div className="p-3 rounded-xl border bg-muted/30">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground block mb-1">Department:</span>
              <span className="text-base sm:text-lg font-black text-foreground">{profile.department || "Not specified"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {section === "resources" && (
      <section aria-labelledby="resources-heading" className="space-y-6">
        <h2 id="resources-heading" className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">Learning and support resources</h2>
        <div className="my-4 grid gap-4 sm:grid-cols-[1fr_18rem]">
          <Label className="relative">
            <span className="sr-only">Search resources</span>
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input className="pl-11 h-12 text-base font-bold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources..." />
          </Label>
          <Label>
            <span className="sr-only">Resource category</span>
            <select className="h-12 w-full rounded-md border-2 bg-background px-4 text-base font-bold" value={resourceCategory} onChange={(event) => setResourceCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Label>
        </div>
        {filteredResources.length === 0 ? <PageState message={resources.length ? "No resources match these filters." : "No published resources are available for your study level yet."} /> : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="rounded-2xl border-2 shadow-md hover:shadow-lg transition-all p-2">
                <CardContent className="p-6">
                  <Badge variant="outline" className="text-xs font-black uppercase tracking-wider px-3 py-1 border-primary/40 text-primary">{resource.category}</Badge>
                  <h3 className="mt-3 text-lg sm:text-xl font-black text-foreground">{resource.title}</h3>
                  <p className="mt-2 text-sm sm:text-base font-semibold text-foreground/80 leading-relaxed">{resource.summary}</p>
                  <a href={resource.url} className="mt-5 inline-flex items-center gap-1.5 text-base font-black text-primary hover:underline" target={resource.url.startsWith("http") ? "_blank" : undefined} rel={resource.url.startsWith("http") ? "noreferrer" : undefined}>
                    Open resource →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    )}

    {section === "support" && (
      <section className="mx-auto max-w-3xl" aria-labelledby="support-heading">
        <h2 id="support-heading" className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">Request student support</h2>
        <p className="mt-2 text-sm sm:text-base font-bold text-foreground/80">Urgent safety or medical concerns should be directed to your institution's published emergency contacts, not this form.</p>
        <Card className="mt-6 rounded-2xl border-2 shadow-lg p-3">
          <CardContent className="space-y-5 p-6">
            <Label className="text-base font-black uppercase tracking-wider text-foreground block">
              Category
              <select className="mt-2 h-12 w-full rounded-lg border-2 bg-background px-4 text-base font-bold" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </Label>
            <Label className="text-base font-black uppercase tracking-wider text-foreground block">
              Subject
              <Input className="mt-2 h-12 text-base font-bold" value={form.subject} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
            </Label>
            <Label className="text-base font-black uppercase tracking-wider text-foreground block">
              How can we help?
              <Textarea className="mt-2 min-h-36 text-base font-bold" value={form.description} maxLength={5000} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </Label>
            <Label className="text-base font-black uppercase tracking-wider text-foreground block">
              Preferred contact
              <select className="mt-2 h-12 w-full rounded-lg border-2 bg-background px-4 text-base font-bold" value={form.preferredContact} onChange={(event) => setForm((current) => ({ ...current, preferredContact: event.target.value }))}>
                <option value="institutional_email">Institutional email</option>
                <option value="platform">Platform update</option>
              </select>
            </Label>
            <label className="flex items-start gap-3 text-sm sm:text-base font-bold text-foreground/85 cursor-pointer pt-2">
              <input className="mt-1 h-5 w-5 rounded border-2 text-primary" type="checkbox" checked={form.privacyAcknowledged} onChange={(event) => setForm((current) => ({ ...current, privacyAcknowledged: event.target.checked }))} />
              <span>I understand this request will be stored for student-support purposes. I will not include passwords, payment details, or unnecessary sensitive information.</span>
            </label>
            {formError && <p role="alert" className="text-sm font-bold text-destructive">{formError}</p>}
            <Button className="h-12 px-8 text-base font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-lg" disabled={createRequest.isPending || !form.privacyAcknowledged} onClick={() => { setFormError(""); createRequest.mutate(); }}>
              {createRequest.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Submit request
            </Button>
          </CardContent>
        </Card>
      </section>
    )}

    {section === "requests" && (
      <section aria-labelledby="requests-heading">
        <h2 id="requests-heading" className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">My support requests</h2>
        <div className="mt-6">
          {!requests.length ? <PageState message="You have not submitted a student support request yet." /> : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="rounded-2xl border-2 shadow-md p-2">
                  <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-black text-foreground">{request.subject}</h3>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-wider px-3 py-1 border-primary/40 text-primary">{request.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-muted-foreground">{request.category} · {new Date(request.createdAt).toLocaleDateString("en-GB")}</p>
                      <p className="mt-2.5 line-clamp-2 text-base font-semibold text-foreground/85">{request.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    )}
  </main></div>;
}
