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
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        {retry && (
          <Button variant="outline" className="mt-4" onClick={retry}>
            <RefreshCw className="mr-2 h-4 w-4" />Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
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

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <StudentToolbar />
      <main id="main-content" className="w-full px-3 py-3 sm:px-4 lg:px-5 xl:px-6">
        <header className={`mb-3 grid gap-3 ${isMvpDemoAccess ? "xl:grid-cols-[minmax(28rem,0.8fr)_minmax(42rem,1.2fr)] xl:items-stretch" : ""}`}>
          <div className="flex min-w-0 flex-col justify-center py-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <GraduationCap className="h-7 w-7 flex-shrink-0 text-primary sm:h-8 sm:w-8" />
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Student Help Point</h1>
              <ComingSoonBadge />
              <Badge className="bg-primary px-2.5 py-0.5 text-xs font-black text-primary-foreground">{profile.studyLevel}</Badge>
              {isMvpDemoAccess && <Badge variant="outline" className="border border-primary/40 px-2.5 py-0.5 text-xs font-black">Demo preview</Badge>}
            </div>
            <p className="mt-1.5 text-sm font-bold leading-snug text-foreground/85 sm:text-base">
              Support and published resources for {profile.programme}. Your marketplace role is unchanged.
            </p>
          </div>
          {isMvpDemoAccess && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 sm:p-4 xl:flex xl:items-center xl:justify-between xl:gap-4">
              <p className="min-w-0 text-sm font-bold leading-snug text-amber-950 dark:text-amber-200 sm:text-base">
                Preview mode uses illustrative student data and temporary in-memory requests. Strict registry and email verification remain enforced in production.
              </p>
              <fieldset className="mt-3 shrink-0 border-t border-amber-200 pt-2.5 dark:border-amber-800 xl:mt-0 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                <legend className="text-xs font-black uppercase tracking-wide text-amber-950 dark:text-amber-200 sm:text-sm">Preview study level</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(["UG", "PG", "PhD"] as const).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="default"
                      variant={profile.studyLevel === level ? "default" : "outline"}
                      disabled={changeDemoLevel.isPending}
                      aria-pressed={profile.studyLevel === level}
                      onClick={() => changeDemoLevel.mutate(level)}
                      className={`h-8 border px-3.5 text-xs font-black uppercase tracking-wider shadow-xs ${profile.studyLevel === level ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600" : "border-amber-300 text-amber-950 dark:border-amber-700 dark:text-amber-200"}`}
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
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <Card className="rounded-xl border border-border/70 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 flex-shrink-0 text-primary sm:h-7 sm:w-7" />
                    <p className="text-sm font-black uppercase tracking-wide text-foreground">Available resources</p>
                  </div>
                  <p className="mt-1.5 text-3xl font-black leading-none text-primary sm:text-4xl">{resources.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-border/70 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-6 w-6 flex-shrink-0 text-primary sm:h-7 sm:w-7" />
                    <p className="text-sm font-black uppercase tracking-wide text-foreground">My help requests</p>
                  </div>
                  <p className="mt-1.5 text-3xl font-black leading-none text-primary sm:text-4xl">{requests.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-amber-300 bg-amber-50/40 shadow-sm transition-all hover:shadow-md dark:border-amber-700 dark:bg-amber-950/20">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400 sm:h-7 sm:w-7" />
                    <p className="text-base font-black uppercase tracking-wide text-foreground">Need assistance?</p>
                  </div>
                  <Button
                    className="mt-2.5 h-9 w-full bg-amber-500 px-5 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-amber-600"
                    onClick={() => setLocation("/farmers-help/student/support")}
                  >
                    Request help
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-xl border border-primary/30 shadow-sm">
              <CardHeader className="px-4 py-2.5">
                <CardTitle className="text-lg font-black uppercase tracking-wide text-foreground sm:text-xl">
                  {isMvpDemoAccess ? "Student profile preview" : "Verified student profile"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2.5 p-3.5 pt-0 text-sm sm:grid-cols-2 xl:grid-cols-4 xl:px-4">
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Student number:</span>
                  <span className="text-sm font-black text-foreground sm:text-base">{profile.studentNumber}</span>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Institutional email:</span>
                  <span className="break-all text-sm font-black text-foreground sm:text-base">{profile.institutionalEmail}</span>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Programme:</span>
                  <span className="text-sm font-black text-foreground sm:text-base">{profile.programme}</span>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Department:</span>
                  <span className="text-sm font-black text-foreground sm:text-base">{profile.department || "Not specified"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Component B: The Redesigned Human Bio-Cycle Infographic */}
            <section aria-labelledby="bio-cycle-heading">
              <Card className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-muted/20 to-primary/5 shadow-md">
                <CardHeader className="p-3.5 pb-2.5 sm:p-4 sm:pb-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="mb-1.5 border-primary/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary sm:text-xs">
                        Agricultural Education &amp; Lifelong Roadmap
                      </Badge>
                      <CardTitle id="bio-cycle-heading" className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                        Component B: The Redesigned Human Bio-Cycle
                      </CardTitle>
                    </div>
                    <Badge className="border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-black text-primary">
                      7 Stages of Purpose
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-bold leading-snug text-foreground/80">
                    Replacing &apos;Retire&apos; with &apos;Legacy&apos; — A lifelong trajectory connecting childhood nature exposure, student toolbars, STEM apprenticeships, productive enterprise, and elder mentorship.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 p-3.5 pt-0 sm:p-4 sm:pt-0 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
                  <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-black/5 p-2 shadow-inner dark:bg-black/40 sm:p-3">
                    <img
                      src="/images/human-bio-cycle.png"
                      alt="Component B: The Redesigned Human Bio-Cycle. 7 Stages of Purpose: Replacing 'Retire' with 'Legacy'"
                      className="h-auto max-h-[430px] w-full rounded-lg object-contain shadow-sm transition-transform duration-300 hover:scale-[1.01]"
                      loading="lazy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 xl:grid-cols-2 xl:content-center">
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">0–5 Foundation</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Nature Exposure</span>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">6–16 Learning</span>
                      <span className="text-[10px] sm:text-xs text-foreground/90 font-bold">Agri-Literacy &amp; Toolbar</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">17–22 Specialization</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">STEM Apprenticeships</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">22–30 Productive</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Tech &amp; Logistics Engine</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">30–50 Family-Driven</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Processing &amp; Mgmt</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">50–70 Knowledge</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Mentorship &amp; QA</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <span className="text-[11px] sm:text-xs font-black text-primary block">70+ Legacy</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Cultural Stewardship</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        )}

        {section === "resources" && (
          <section aria-labelledby="resources-heading" className="space-y-4">
            <h2 id="resources-heading" className="text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">Learning and support resources</h2>
            <div className="my-3 grid gap-3 sm:grid-cols-[1fr_18rem]">
              <Label className="relative">
                <span className="sr-only">Search resources</span>
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input className="h-10 pl-11 text-sm font-bold" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources..." />
              </Label>
              <Label>
                <span className="sr-only">Resource category</span>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm font-bold" value={resourceCategory} onChange={(event) => setResourceCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </Label>
            </div>
            {filteredResources.length === 0 ? (
              <PageState message={resources.length ? "No resources match these filters." : "No published resources are available for your study level yet."} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredResources.map((resource) => (
                  <Card key={resource.id} className="rounded-xl border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <Badge variant="outline" className="border-primary/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">{resource.category}</Badge>
                      <h3 className="mt-2 text-lg font-black text-foreground">{resource.title}</h3>
                      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-foreground/80">{resource.summary}</p>
                      <a href={resource.url} className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-primary hover:underline" target={resource.url.startsWith("http") ? "_blank" : undefined} rel={resource.url.startsWith("http") ? "noreferrer" : undefined}>
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
          <section className="mx-auto max-w-4xl" aria-labelledby="support-heading">
            <h2 id="support-heading" className="text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">Request student support</h2>
            <p className="mt-2 text-sm sm:text-base font-bold text-foreground/80">Urgent safety or medical concerns should be directed to your institution&apos;s published emergency contacts, not this form.</p>
            <Card className="mt-4 rounded-xl border shadow-md">
              <CardContent className="space-y-4 p-5">
                <Label className="block text-sm font-black uppercase tracking-wider text-foreground">
                  Category
                  <select className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm font-bold" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </Label>
                <Label className="block text-sm font-black uppercase tracking-wider text-foreground">
                  Subject
                  <Input className="mt-1.5 h-10 text-sm font-bold" value={form.subject} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
                </Label>
                <Label className="block text-sm font-black uppercase tracking-wider text-foreground">
                  How can we help?
                  <Textarea className="mt-1.5 min-h-28 text-sm font-bold" value={form.description} maxLength={5000} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </Label>
                <Label className="block text-sm font-black uppercase tracking-wider text-foreground">
                  Preferred contact
                  <select className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm font-bold" value={form.preferredContact} onChange={(event) => setForm((current) => ({ ...current, preferredContact: event.target.value }))}>
                    <option value="institutional_email">Institutional email</option>
                    <option value="platform">Platform update</option>
                  </select>
                </Label>
                <label className="flex items-start gap-3 text-sm sm:text-base font-bold text-foreground/85 cursor-pointer pt-2">
                  <input className="mt-1 h-5 w-5 rounded border-2 text-primary" type="checkbox" checked={form.privacyAcknowledged} onChange={(event) => setForm((current) => ({ ...current, privacyAcknowledged: event.target.checked }))} />
                  <span>I understand this request will be stored for student-support purposes. I will not include passwords, payment details, or unnecessary sensitive information.</span>
                </label>
                {formError && <p role="alert" className="text-sm font-bold text-destructive">{formError}</p>}
                <Button className="h-10 bg-primary px-6 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-md" disabled={createRequest.isPending || !form.privacyAcknowledged} onClick={() => { setFormError(""); createRequest.mutate(); }}>
                  {createRequest.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Submit request
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {section === "requests" && (
          <section aria-labelledby="requests-heading">
            <h2 id="requests-heading" className="text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">My support requests</h2>
            <div className="mt-4">
              {!requests.length ? <PageState message="You have not submitted a student support request yet." /> : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <Card key={request.id} className="rounded-xl border shadow-sm">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
      </main>
    </div>
  );
}
