import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, Building2, Shield, GraduationCap, Landmark, Wheat, Droplets,
  Tractor, Sun, Heart, FileText, ExternalLink, ChevronRight, Search, 
  CheckCircle, Clock, AlertCircle, XCircle, Plus, ClipboardList,
  BarChart3, TrendingUp, Phone, MapPin, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TopNavigation } from "@/components/top-navigation";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import type { SchemeApplication } from "@shared/schema";

interface Scheme {
  id: string;
  name: string;
  description: string;
  category: "subsidy" | "insurance" | "training" | "financial" | "infrastructure";
  eligibility: string;
  benefits: string;
  deadline?: string;
  amount?: string;
  icon: typeof Building2;
  urgency?: "high" | "medium" | "low";
}

const governmentSchemes: Scheme[] = [
  {
    id: "pmksy",
    name: "PM-KISAN Samman Nidhi",
    description: "Direct income support of Rs. 6,000 per year to farmer families in three equal installments.",
    category: "financial",
    eligibility: "All landholding farmers with cultivable land",
    benefits: "Rs. 6,000/year in 3 installments of Rs. 2,000 each",
    amount: "Rs. 6,000/year",
    icon: Landmark,
    urgency: "high",
  },
  {
    id: "pmfby",
    name: "Pradhan Mantri Fasal Bima Yojana",
    description: "Comprehensive crop insurance scheme covering all food crops, oilseeds, and horticultural crops.",
    category: "insurance",
    eligibility: "All farmers including sharecroppers and tenant farmers",
    benefits: "Coverage against yield losses due to natural calamities, pests, and diseases",
    deadline: "Varies by crop season",
    icon: Shield,
    urgency: "high",
  },
  {
    id: "kcc",
    name: "Kisan Credit Card (KCC)",
    description: "Provides farmers with timely access to credit for their agricultural and allied activities.",
    category: "financial",
    eligibility: "All farmers, fishermen, and animal husbandry farmers",
    benefits: "Credit limit based on landholding with interest subvention",
    amount: "Up to Rs. 3 lakh",
    icon: Landmark,
  },
  {
    id: "subsidy-solar",
    name: "PM-KUSUM Solar Pump Scheme",
    description: "Subsidy for installation of solar pumps and grid-connected solar power plants.",
    category: "subsidy",
    eligibility: "Individual farmers, groups, cooperatives",
    benefits: "60% subsidy on solar pump installation",
    amount: "60% subsidy",
    icon: Sun,
    urgency: "medium",
  },
  {
    id: "subsidy-irrigation",
    name: "Micro Irrigation Subsidy",
    description: "Financial assistance for drip and sprinkler irrigation systems.",
    category: "subsidy",
    eligibility: "All categories of farmers",
    benefits: "55-90% subsidy based on category and region",
    amount: "Up to 90% subsidy",
    icon: Droplets,
  },
  {
    id: "training-atma",
    name: "ATMA Training Programs",
    description: "Agricultural technology management training for farmers through Krishi Vigyan Kendras.",
    category: "training",
    eligibility: "All farmers in the district",
    benefits: "Free training on modern farming techniques, exposure visits",
    icon: GraduationCap,
  },
  {
    id: "subsidy-seed",
    name: "Seed Subsidy Scheme",
    description: "Subsidy on certified/quality seeds for major crops.",
    category: "subsidy",
    eligibility: "All farmers purchasing certified seeds",
    benefits: "50-60% subsidy on seed cost",
    amount: "Up to 60% subsidy",
    icon: Wheat,
    urgency: "medium",
  },
  {
    id: "training-skill",
    name: "Skill Development for Farmers",
    description: "Skill training programs covering organic farming, food processing, and value addition.",
    category: "training",
    eligibility: "Farmers, rural youth, women",
    benefits: "Free training with certification, placement assistance",
    icon: GraduationCap,
  },
  {
    id: "financial-agri",
    name: "Agriculture Infrastructure Fund",
    description: "Credit facility for investment in post-harvest management and community farming assets.",
    category: "infrastructure",
    eligibility: "FPOs, PACS, entrepreneurs, startups",
    benefits: "3% interest subvention and credit guarantee",
    amount: "Up to Rs. 2 crore",
    icon: Building2,
  },
  {
    id: "subsidy-tractor",
    name: "Tractor Subsidy Scheme",
    description: "Financial assistance for purchase of tractors and farm machinery.",
    category: "subsidy",
    eligibility: "Small and marginal farmers",
    benefits: "25-50% subsidy on tractor purchase",
    amount: "Up to 50% subsidy",
    icon: Tractor,
    urgency: "low",
  },
  {
    id: "insurance-health",
    name: "Ayushman Bharat for Farmers",
    description: "Health insurance coverage for farmer families under the national health scheme.",
    category: "insurance",
    eligibility: "All farmer families meeting criteria",
    benefits: "Up to Rs. 5 lakh health coverage per family per year",
    amount: "Rs. 5 lakh coverage",
    icon: Heart,
  },
  {
    id: "interest-subvention",
    name: "Interest Subvention Scheme",
    description: "Reduced interest rate on short-term crop loans for farmers.",
    category: "financial",
    eligibility: "Farmers availing crop loans up to Rs. 3 lakh",
    benefits: "4% interest rate with 3% subvention for prompt repayment",
    amount: "4% interest rate",
    icon: Landmark,
  },
  {
    id: "fpo-promotion",
    name: "FPO Promotion & Formation",
    description: "Financial support and capacity building for Farmer Producer Organisations.",
    category: "infrastructure",
    eligibility: "Groups of 100+ farmers willing to form an FPO",
    benefits: "Rs. 18 lakh support per FPO over 5 years",
    amount: "Rs. 18 lakh/FPO",
    icon: Building2,
    urgency: "low",
  },
  {
    id: "organic-cert",
    name: "Paramparagat Krishi Vikas Yojana",
    description: "Promotion of organic farming with certification support for cluster groups of farmers.",
    category: "subsidy",
    eligibility: "Farmer clusters of minimum 20 hectares",
    benefits: "Rs. 50,000/hectare assistance for 3 years",
    amount: "Rs. 50,000/ha",
    icon: Wheat,
  },
];

const categoryConfig = {
  subsidy: { label: "Subsidies", color: "bg-green-500", textColor: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-950/30", icon: Building2 },
  insurance: { label: "Insurance", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/30", icon: Shield },
  training: { label: "Training", color: "bg-purple-500", textColor: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/30", icon: GraduationCap },
  financial: { label: "Financial Aid", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-950/30", icon: Landmark },
  infrastructure: { label: "Infrastructure", color: "bg-teal-500", textColor: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50 dark:bg-teal-950/30", icon: Building2 },
};

const statusConfig = {
  submitted: { label: "Submitted", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  under_review: { label: "Under Review", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  approved: { label: "Approved", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
};

interface ApplicationFormData {
  farmerName: string;
  phone: string;
  location: string;
  landArea: string;
}

export default function GovernmentSchemes() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    farmerName: "", phone: "", location: "", landArea: "",
  });
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [] } = useQuery<SchemeApplication[]>({
    queryKey: ["/api/government/applications"],
  });

  const applyMutation = useMutation({
    mutationFn: async (data: { schemeId: string; schemeName: string } & ApplicationFormData) => {
      const res = await fetch("/api/government/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: (_, vars) => {
      setApplied((prev) => new Set(Array.from(prev).concat(vars.schemeId)));
      setShowApplicationForm(false);
      setSelectedScheme(null);
      queryClient.invalidateQueries({ queryKey: ["/api/government/applications"] });
      toast({
        title: "Application Submitted!",
        description: `Your application for ${vars.schemeName} has been received.`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit application. Please try again.", variant: "destructive" });
    },
  });

  const filteredSchemes = governmentSchemes.filter((scheme) => {
    const matchesSearch =
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || scheme.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApply = () => {
    if (!selectedScheme) return;
    if (!formData.farmerName || !formData.phone) {
      toast({ title: "Required Fields", description: "Please fill in your name and phone number.", variant: "destructive" });
      return;
    }
    applyMutation.mutate({
      schemeId: selectedScheme.id,
      schemeName: selectedScheme.name,
      ...formData,
    });
  };

  const stats = {
    total: governmentSchemes.length,
    subsidies: governmentSchemes.filter((s) => s.category === "subsidy").length,
    myApplications: applications.length,
    approved: applications.filter((a) => a.status === "approved").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white">
        <div className="w-full px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else setLocation("/");
            }}
            className="h-8 px-2 text-blue-200 hover:text-white hover:bg-blue-800/50 mb-3 -ml-2 text-xs sm:text-sm font-bold"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1.5 flex flex-wrap items-center gap-2.5 tracking-tight">
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-blue-300 shrink-0" />
                {t("gov_schemes.title", "Government Schemes Repository")}
                <ComingSoonBadge className="!px-3 !py-1.5 !text-sm sm:!text-base" />
              </h1>
              <p className="text-sm sm:text-base font-bold text-blue-100/90 max-w-3xl leading-relaxed">
                {t("gov_schemes.subtitle", "Discover and apply for government subsidies, insurance schemes, training programs, and financial aid — all in one place.")}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 w-full lg:w-auto">
              {[
                { value: stats.total, label: t("gov_schemes.stat_schemes", "Schemes"), icon: FileText },
                { value: stats.subsidies, label: t("gov_schemes.stat_subsidies", "Subsidies"), icon: TrendingUp },
                { value: stats.myApplications, label: t("gov_schemes.stat_my_apps", "My Applications"), icon: ClipboardList },
                { value: stats.approved, label: t("gov_schemes.stat_approved", "Approved"), icon: CheckCircle },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-blue-800/50 rounded-xl p-2.5 text-center border border-blue-400/30 min-w-[96px] shadow-sm">
                  <Icon className="h-4 w-4 text-blue-300 mx-auto mb-1" />
                  <div className="text-xl sm:text-2xl font-black text-white leading-none">{value}</div>
                  <div className="text-blue-200 text-[11px] sm:text-xs font-bold mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <Tabs defaultValue="browse" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
            <TabsList className="h-auto flex-wrap gap-1.5 border border-emerald-300 bg-emerald-50/90 p-1.5 rounded-xl shadow-sm" data-testid="tabs-government">
              <TabsTrigger value="browse" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">Browse Schemes</TabsTrigger>
              <TabsTrigger value="applications" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">
                My Applications
                {applications.length > 0 && (
                  <Badge className="ml-1.5 h-5 w-5 p-0 text-[10px] font-black flex items-center justify-center rounded-full" variant="secondary">
                    {applications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="eligibility" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">Eligibility Guide</TabsTrigger>
            </TabsList>
          </div>

          {/* BROWSE TAB */}
          <TabsContent value="browse" className="mt-0">
            <div className="flex flex-col xl:flex-row gap-2.5 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search schemes..."
                  className="pl-9 h-9 text-sm font-bold rounded-lg border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-schemes"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  className={`h-9 px-3 text-xs sm:text-sm font-black rounded-lg border ${activeCategory === "all" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
                  variant={activeCategory === "all" ? "default" : "outline"}
                  onClick={() => setActiveCategory("all")}
                  data-testid="filter-all-schemes"
                >
                  All ({governmentSchemes.length})
                </Button>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    size="sm"
                    className={`h-9 px-3 text-xs sm:text-sm font-black rounded-lg border ${activeCategory === key ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
                    variant={activeCategory === key ? "default" : "outline"}
                    onClick={() => setActiveCategory(key)}
                    data-testid={`filter-${key}`}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 items-stretch">
              {filteredSchemes.map((scheme) => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  applied={applied.has(scheme.id) || applications.some((a) => a.schemeId === scheme.id)}
                  onApply={() => {
                    setSelectedScheme(scheme);
                    setShowApplicationForm(true);
                  }}
                />
              ))}
            </div>

            {filteredSchemes.length === 0 && (
              <div className="text-center py-10 sm:py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No schemes found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            )}
          </TabsContent>

          {/* MY APPLICATIONS TAB */}
          <TabsContent value="applications" className="mt-0">
            {applications.length === 0 ? (
              <div className="text-center py-10 sm:py-12 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <h3 className="text-base font-medium mb-1.5">No applications yet</h3>
                <p className="text-sm mb-3">Browse schemes and click "Apply Now" to start your first application.</p>
                <Button size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[data-value="browse"]')?.click()}>
                  Browse Schemes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
                {applications.map((app) => {
                  const status = statusConfig[app.status];
                  const StatusIcon = status.icon;
                  return (
                    <Card key={app.id} className="border-border/60 rounded-xl" data-testid={`application-card-${app.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm sm:text-base">{app.schemeName}</h3>
                            <div className="flex flex-wrap gap-2.5 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" /> {app.farmerName}
                              </span>
                              {app.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {app.location}
                                </span>
                              )}
                              {app.landArea && (
                                <span className="flex items-center gap-1">
                                  <Wheat className="h-3.5 w-3.5" /> {app.landArea}
                                </span>
                              )}
                              {app.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" /> {app.phone}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted: {new Date(app.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ELIGIBILITY GUIDE TAB */}
          <TabsContent value="eligibility" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {[
                {
                  title: "Small & Marginal Farmers",
                  description: "Farmers with land holdings below 2 hectares",
                  schemes: ["PM-KISAN Samman Nidhi", "Micro Irrigation Subsidy", "Tractor Subsidy (50%)", "PMFBY Crop Insurance", "Kisan Credit Card"],
                  color: "border-green-500 dark:border-green-700",
                  bg: "bg-green-50 dark:bg-green-950/20",
                  badge: "2+ crore farmers",
                },
                {
                  title: "Medium & Large Farmers",
                  description: "Farmers with land holdings above 2 hectares",
                  schemes: ["Agriculture Infrastructure Fund", "Solar Pump Scheme", "Interest Subvention", "Seed Subsidy", "Skill Development"],
                  color: "border-blue-500 dark:border-blue-700",
                  bg: "bg-blue-50 dark:bg-blue-950/20",
                  badge: "All states eligible",
                },
                {
                  title: "Women Farmers",
                  description: "Special benefits for women in agriculture",
                  schemes: ["30% reservation in all subsidies", "Skill Development Training", "Mahila Kisan Sashaktikaran", "NABARD Women Self-Help Groups", "Women FPO Support"],
                  color: "border-purple-500 dark:border-purple-700",
                  bg: "bg-purple-50 dark:bg-purple-950/20",
                  badge: "Priority category",
                },
                {
                  title: "SC/ST Farmers",
                  description: "Additional benefits for scheduled caste/tribe farmers",
                  schemes: ["Enhanced subsidy rates (10% extra)", "Priority land allocation", "Special training programs", "Dedicated loan schemes", "Scholarship programs"],
                  color: "border-amber-500 dark:border-amber-700",
                  bg: "bg-amber-50 dark:bg-amber-950/20",
                  badge: "Enhanced benefits",
                },
              ].map((group) => (
                <Card key={group.title} className={`border-l-4 rounded-xl ${group.color} ${group.bg}`}>
                  <CardHeader className="p-4 pb-2.5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base">{group.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">{group.badge}</Badge>
                    </div>
                    <CardDescription className="text-xs">{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ul className="space-y-1">
                      {group.schemes.map((s) => (
                        <li key={s} className="text-xs sm:text-sm flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-4 border-border/60 rounded-xl">
              <CardHeader className="p-4 pb-2.5">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  How to Apply — Step by Step
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    { step: "1", title: "Find Your Scheme", desc: "Search and browse schemes based on your eligibility", icon: Search },
                    { step: "2", title: "Check Eligibility", desc: "Read the eligibility criteria carefully", icon: CheckCircle },
                    { step: "3", title: "Submit Application", desc: "Fill in the application form with your details", icon: FileText },
                    { step: "4", title: "Track Status", desc: "Monitor your application in My Applications tab", icon: Clock },
                  ].map(({ step, title, desc, icon: Icon }) => (
                    <div key={step} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg bg-muted/40">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {step}
                      </div>
                      <Icon className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">{title}</h4>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Application Form Dialog */}
      {showApplicationForm && selectedScheme && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowApplicationForm(false); setSelectedScheme(null); }}
        >
          <Card
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-apply-scheme"
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-1.5">Apply Now</Badge>
                  <CardTitle className="text-base">{selectedScheme.name}</CardTitle>
                  <CardDescription className="mt-1">{categoryConfig[selectedScheme.category].label}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowApplicationForm(false); setSelectedScheme(null); }}
                  data-testid="button-close-dialog"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {selectedScheme.amount && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2.5 text-sm text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <strong>Benefit:</strong> {selectedScheme.amount}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="farmerName">Full Name *</Label>
                <Input
                  id="farmerName"
                  placeholder="Enter your full name"
                  value={formData.farmerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, farmerName: e.target.value }))}
                  className="h-9"
                  data-testid="input-farmer-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="+91 or +44 mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="h-9"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Village / District / County</Label>
                <Input
                  id="location"
                  placeholder="Your farm location"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="h-9"
                  data-testid="input-location"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="landArea">Land Area</Label>
                <Input
                  id="landArea"
                  placeholder="e.g. 2.5 acres or 1 hectare"
                  value={formData.landArea}
                  onChange={(e) => setFormData((prev) => ({ ...prev, landArea: e.target.value }))}
                  className="h-9"
                  data-testid="input-land-area"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground">
                <strong>Eligibility:</strong> {selectedScheme.eligibility}
              </div>

              <Button
                className="w-full"
                onClick={handleApply}
                disabled={applyMutation.isPending}
                data-testid="button-submit-application"
              >
                {applyMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your application will be reviewed within 5–7 working days
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SchemeCard({ scheme, applied, onApply }: { scheme: Scheme; applied: boolean; onApply: () => void }) {
  const config = categoryConfig[scheme.category];
  const Icon = scheme.icon;

  return (
    <Card className="h-full flex flex-col overflow-visible border border-border/80 rounded-xl shadow-sm hover:shadow-md transition-all" data-testid={`scheme-card-${scheme.id}`}>
      <CardHeader className="p-3.5 sm:p-4 pb-2.5">
        <div className="flex items-start gap-2.5">
          <div className={`p-2.5 rounded-lg ${config.color} text-white shrink-0 shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm sm:text-base font-black text-foreground leading-snug line-clamp-2">{scheme.name}</CardTitle>
              {scheme.urgency === "high" && (
                <Badge variant="destructive" className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">Urgent</Badge>
              )}
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md">{config.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3.5 sm:p-4 pt-0 flex flex-col gap-2.5">
        <CardDescription className="text-xs font-bold text-muted-foreground leading-relaxed line-clamp-2">
          {scheme.description}
        </CardDescription>

        {scheme.amount && (
          <div className={`rounded-lg p-2.5 ${config.bg} border border-border/20`}>
            <span className={`text-xs font-black ${config.textColor}`}>
              Benefit: {scheme.amount}
            </span>
          </div>
        )}

        <div className="space-y-1 text-xs font-bold">
          <div>
            <span className="text-muted-foreground">Eligibility: </span>
            <span className="text-foreground line-clamp-1">{scheme.eligibility}</span>
          </div>
          {scheme.deadline && (
            <div>
              <span className="text-muted-foreground">Deadline: </span>
              <span className="text-orange-600 dark:text-orange-400 font-black">{scheme.deadline}</span>
            </div>
          )}
        </div>

        {applied ? (
          <Button className="w-full h-9 mt-auto text-xs sm:text-sm font-black rounded-lg gap-1.5" variant="secondary" disabled>
            <CheckCircle className="h-4 w-4 text-green-600" />
            Applied
          </Button>
        ) : (
          <Button className="w-full h-9 mt-auto text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-sm rounded-lg gap-1.5" onClick={onApply} data-testid={`button-apply-${scheme.id}`}>
            Apply Now
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
