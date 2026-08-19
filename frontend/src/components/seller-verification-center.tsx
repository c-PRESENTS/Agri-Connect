import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2, Check, CheckCircle2, FileCheck2, Loader2, Plus, Send, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { SellerVerificationCapability, SellerVerificationRequirement } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getData } from "country-list";

type Address = { line1: string; line2: string; city: string; region: string; postalCode: string; country: string };
type VerificationState = {
  profile: null | {
    country: string; entityType: string; legalName: string; tradingName?: string | null; registrationNumber?: string | null;
    registeredAddress: Address; operatingAddress: Address; primaryActivities: string[]; website?: string | null; contactEmail: string; contactPhone: string;
  };
  case: null | { id: string; status: string; reviewReason?: string | null; submittedAt?: string | null; expiresAt?: string | null };
  identifiers: Array<{ id: string; country: string; type: string; maskedValue: string; status: string }>;
  people: Array<{ id: string; fullName: string; role: string; ownershipPercent?: number | null; country: string }>;
  documents: Array<{ id: string; requirementCode: string; documentType: string; originalFileName: string; status: string; rejectionReason?: string | null }>;
  supported: boolean;
  requirements: Array<SellerVerificationRequirement & { complete: boolean }>;
  capabilities: SellerVerificationCapability;
};

const emptyAddress = (country = "IN"): Address => ({ line1: "", line2: "", city: "", region: "", postalCode: "", country });
const initialProfile = { country: "IN", entityType: "individual", legalName: "", tradingName: "", registrationNumber: "", registeredAddress: emptyAddress(), operatingAddress: emptyAddress(), primaryActivities: ["fresh_produce"], website: "", contactEmail: "", contactPhone: "" };
const activityOptions = [
  ["fresh_produce", "Fresh produce"], ["food", "Food"], ["processed_food", "Processed food"], ["dairy", "Dairy"], ["meat", "Meat or poultry"], ["seeds", "Seeds"], ["fertilizer", "Fertilizer"], ["agricultural_tools", "Agricultural tools"],
] as const;
const countryOptions = getData().sort((first, second) => first.name.localeCompare(second.name));

function defaultTaxType(country: string): string {
  if (country === "IN") return "pan";
  if (country === "GB") return "company_registration";
  return "tax_id";
}

function statusStyle(status = "not_started") {
  if (status === "verified") return "bg-emerald-100 text-emerald-800";
  if (["pending_review", "in_progress"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["rejected", "suspended", "expired"].includes(status)) return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read this document"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function SellerVerificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<VerificationState>({ queryKey: ["/api/seller/verification/status"] });
  const [profile, setProfile] = useState(initialProfile);
  const [sameAddress, setSameAddress] = useState(true);
  const [taxType, setTaxType] = useState("pan");
  const [taxValue, setTaxValue] = useState("");
  const [person, setPerson] = useState({ fullName: "", role: "representative", ownershipPercent: "", country: "IN" });
  const [documentRequirement, setDocumentRequirement] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (data?.profile) {
      setProfile({
        ...initialProfile,
        ...data.profile,
        tradingName: data.profile.tradingName ?? "",
        registrationNumber: data.profile.registrationNumber ?? "",
        website: data.profile.website ?? "",
      });
      setTaxType(defaultTaxType(data.profile.country));
      setPerson((current) => ({ ...current, country: data.profile!.country }));
    } else if (user) {
      setProfile((current) => ({ ...current, legalName: user.name || [user.firstName, user.lastName].filter(Boolean).join(" "), contactEmail: user.email ?? "", contactPhone: user.phone ?? "" }));
    }
  }, [data?.profile, user]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/seller/verification/status"] });
  const useApiMutation = (method: "POST" | "PUT" | "DELETE", url: string, body?: unknown) => useMutation({
    mutationFn: async () => (await apiRequest(method, url, body)).json(),
    onSuccess: async () => { await refresh(); toast({ title: "Seller verification updated" }); },
    onError: (error: Error) => toast({ title: "Verification update failed", description: error.message, variant: "destructive" }),
  });
  const saveProfile = useApiMutation("PUT", "/api/seller/verification/business-profile", { ...profile, operatingAddress: sameAddress ? profile.registeredAddress : profile.operatingAddress });
  const saveTax = useApiMutation("PUT", "/api/seller/verification/tax-identifiers", { country: profile.country, type: taxType, value: taxValue });
  const addPerson = useApiMutation("POST", "/api/seller/verification/people", { ...person, ownershipPercent: person.ownershipPercent ? Number(person.ownershipPercent) : undefined });
  const submit = useApiMutation("POST", "/api/seller/verification/submit", {});

  const documentRequirements = useMemo(() => data?.requirements.filter((item) => item.kind === "document") ?? [], [data?.requirements]);
  const selectedRequirement = documentRequirements.find((item) => item.code === documentRequirement);
  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!documentFile || !selectedRequirement || !documentType) throw new Error("Choose a checklist item, document type and file");
      return (await apiRequest("POST", "/api/seller/verification/documents", {
        requirementCode: selectedRequirement.code,
        documentType,
        issuingCountry: profile.country,
        fileName: documentFile.name,
        contentType: documentFile.type,
        dataBase64: await fileToBase64(documentFile),
      })).json();
    },
    onSuccess: async () => { setDocumentFile(null); setDocumentRequirement(""); setDocumentType(""); await refresh(); toast({ title: "Document securely uploaded" }); },
    onError: (error: Error) => toast({ title: "Document upload failed", description: error.message, variant: "destructive" }),
  });

  const required = data?.requirements.filter((item) => item.required) ?? [];
  const completed = required.filter((item) => item.complete).length;
  const progress = required.length ? Math.round(completed / required.length * 100) : 0;
  const locked = data?.case?.status === "pending_review";
  const availableTaxTypes = profile.country === "IN"
    ? [["pan", "PAN"], ["gstin", "GSTIN (when applicable)"]]
    : profile.country === "GB"
      ? [["company_registration", "Companies House number"], ["vat", "VAT number (when applicable)"]]
      : [["tax_id", "Tax identification number"], ["vat", "VAT / GST number (when applicable)"]];

  if (isLoading) return <Card><CardContent className="flex items-center gap-2 p-8"><Loader2 className="h-5 w-5 animate-spin" />Loading verification centre</CardContent></Card>;

  return <div className="space-y-5" data-testid="seller-verification-center">
    <Card className="overflow-hidden border-2">
      <div className="bg-gradient-to-r from-emerald-950 to-green-800 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-emerald-200">Marketplace verification</p><h2 className="mt-1 text-2xl font-black">Verification Centre</h2><p className="mt-1 max-w-2xl text-sm text-emerald-100">Complete your business checks before publishing products, accepting payments or receiving payouts.</p></div>
          <Badge className={`${statusStyle(data?.case?.status)} border-0 px-3 py-1.5 text-xs font-black`}>{(data?.case?.status ?? "not started").replaceAll("_", " ")}</Badge>
        </div>
        <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold"><span>{completed} of {required.length} required items complete</span><span>{progress}%</span></div><Progress value={progress} className="h-2 bg-white/20" /></div>
      </div>
      {data?.case?.reviewReason && <div className="flex gap-2 border-t border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"><AlertCircle className="h-5 w-5 shrink-0" /><div><strong>Review note:</strong> {data.case.reviewReason}</div></div>}
    </Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />1. Business profile</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Business country</Label><Select disabled={locked} value={profile.country} onValueChange={(country) => { setProfile((current) => ({ ...current, country, registeredAddress: { ...current.registeredAddress, country }, operatingAddress: { ...current.operatingAddress, country } })); setTaxType(defaultTaxType(country)); setTaxValue(""); setPerson((current) => ({ ...current, country })); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{countryOptions.map((country) => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Business type</Label><Select disabled={locked} value={profile.entityType} onValueChange={(entityType) => setProfile((current) => ({ ...current, entityType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["individual", "sole_proprietor", "partnership", "company", "cooperative", "nonprofit"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Legal name</Label><Input disabled={locked} value={profile.legalName} onChange={(event) => setProfile((current) => ({ ...current, legalName: event.target.value }))} /></div><div><Label>Trading name</Label><Input disabled={locked} value={profile.tradingName} onChange={(event) => setProfile((current) => ({ ...current, tradingName: event.target.value }))} /></div></div>
      <div><Label>{profile.country === "IN" ? "GSTIN number (when applicable)" : "Business registration number (when applicable)"}</Label><Input disabled={locked} value={profile.registrationNumber} onChange={(event) => setProfile((current) => ({ ...current, registrationNumber: event.target.value }))} /></div>
      <AddressFields title="Registered address" value={profile.registeredAddress} disabled={locked} onChange={(registeredAddress) => setProfile((current) => ({ ...current, registeredAddress }))} />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={locked} checked={sameAddress} onChange={(event) => setSameAddress(event.target.checked)} />Operating address is the same</label>
      {!sameAddress && <AddressFields title="Operating address" value={profile.operatingAddress} disabled={locked} onChange={(operatingAddress) => setProfile((current) => ({ ...current, operatingAddress }))} />}
      <div><Label>Primary activities</Label><div className="mt-2 flex flex-wrap gap-2">{activityOptions.map(([value, label]) => { const selected = profile.primaryActivities.includes(value); return <button type="button" disabled={locked} key={value} onClick={() => setProfile((current) => ({ ...current, primaryActivities: selected ? current.primaryActivities.filter((item) => item !== value) : [...current.primaryActivities, value] }))} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{selected && <Check className="mr-1 inline h-3 w-3" />}{label}</button>; })}</div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Contact email</Label><Input disabled={locked} type="email" value={profile.contactEmail} onChange={(event) => setProfile((current) => ({ ...current, contactEmail: event.target.value }))} /></div><div><Label>Contact phone</Label><Input disabled={locked} value={profile.contactPhone} onChange={(event) => setProfile((current) => ({ ...current, contactPhone: event.target.value }))} /></div></div>
      <Button disabled={locked || saveProfile.isPending} onClick={() => saveProfile.mutate()}>{saveProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save business profile</Button>
    </CardContent></Card>

    {data?.profile && <>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />2. Tax and registration identifiers</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[220px_1fr_auto]"><Select disabled={locked} value={taxType} onValueChange={setTaxType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableTaxTypes.map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select><Input disabled={locked} value={taxValue} onChange={(event) => setTaxValue(event.target.value)} placeholder="Identifier is encrypted before storage" /><Button disabled={locked || !taxValue.trim() || saveTax.isPending} onClick={() => saveTax.mutate()}>{saveTax.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></div><div className="mt-4 flex flex-wrap gap-2">{data.identifiers.map((identifier) => <Badge variant="outline" className="gap-2 px-3 py-1.5" key={identifier.id}>{identifier.type.toUpperCase()} {identifier.maskedValue}<span className="text-muted-foreground">{identifier.status}</span></Badge>)}</div></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" />3. Representatives and owners</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[1fr_180px_130px_auto]"><Input disabled={locked} placeholder="Full legal name" value={person.fullName} onChange={(event) => setPerson((current) => ({ ...current, fullName: event.target.value }))} /><Select disabled={locked} value={person.role} onValueChange={(role) => setPerson((current) => ({ ...current, role }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["representative", "director", "partner", "beneficial_owner", "controller"].map((value) => <SelectItem value={value} key={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select><Input disabled={locked} type="number" min="0" max="100" placeholder="Ownership %" value={person.ownershipPercent} onChange={(event) => setPerson((current) => ({ ...current, ownershipPercent: event.target.value }))} /><Button disabled={locked || !person.fullName.trim() || addPerson.isPending} onClick={() => addPerson.mutate()}><Plus className="mr-1 h-4 w-4" />Add</Button></div><div className="mt-4 space-y-2">{data.people.map((entry) => <div className="flex items-center justify-between rounded-xl border p-3" key={entry.id}><div><p className="font-bold">{entry.fullName}</p><p className="text-xs text-muted-foreground">{entry.role.replaceAll("_", " ")}{entry.ownershipPercent != null ? ` · ${entry.ownershipPercent}%` : ""}</p></div><Button variant="ghost" size="icon" disabled={locked} onClick={async () => { await apiRequest("DELETE", `/api/seller/verification/people/${entry.id}`); await refresh(); }} aria-label={`Remove ${entry.fullName}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary" />4. Supporting documents</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]"><Select disabled={locked} value={documentRequirement} onValueChange={(value) => { setDocumentRequirement(value); setDocumentType(""); }}><SelectTrigger><SelectValue placeholder="Checklist item" /></SelectTrigger><SelectContent>{documentRequirements.map((item) => <SelectItem value={item.code} key={item.code}>{item.label}{item.required ? " *" : ""}</SelectItem>)}</SelectContent></Select><Select disabled={locked || !selectedRequirement} value={documentType} onValueChange={setDocumentType}><SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger><SelectContent>{selectedRequirement?.acceptedDocumentTypes?.map((value) => <SelectItem value={value} key={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select><Input disabled={locked} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} /><Button disabled={locked || !documentFile || !documentType || uploadDocument.isPending} onClick={() => uploadDocument.mutate()}><Upload className="mr-1 h-4 w-4" />Upload</Button></div><p className="mt-2 text-xs text-muted-foreground">PDF, JPEG, PNG or WebP up to 5 MB. Documents are private and available only to authorized reviewers.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.documents.map((document) => <div className="rounded-xl border p-3" key={document.id}><div className="flex justify-between gap-2"><p className="truncate text-sm font-bold">{document.originalFileName}</p><Badge className={statusStyle(document.status)}>{document.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{document.requirementCode.replaceAll("_", " ")} · {document.documentType.replaceAll("_", " ")}</p>{document.rejectionReason && <p className="mt-2 text-xs font-semibold text-red-700">{document.rejectionReason}</p>}</div>)}</div></CardContent></Card>

      <Card className="border-2 border-primary/30"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h3 className="font-black">Submit for manual review</h3><p className="mt-1 text-sm text-muted-foreground">All required items must be complete. Editing is locked while the application is reviewed.</p></div><Button disabled={locked || submit.isPending || progress < 100} onClick={() => submit.mutate()}><Send className="mr-2 h-4 w-4" />{locked ? "Review in progress" : "Submit application"}</Button></CardContent></Card>
    </>}

    {data?.case?.status === "verified" && <Card className="border-emerald-300 bg-emerald-50"><CardContent className="flex gap-3 p-5 text-emerald-900"><CheckCircle2 className="h-6 w-6 shrink-0" /><div><p className="font-black">Marketplace seller verified</p><p className="text-sm">You can publish listings. Online payments and payouts become available after separate provider onboarding and capability verification.</p></div></CardContent></Card>}
  </div>;
}

function AddressFields({ title, value, onChange, disabled }: { title: string; value: Address; onChange(value: Address): void; disabled: boolean }) {
  const update = (key: keyof Address, next: string) => onChange({ ...value, [key]: next });
  return <fieldset disabled={disabled} className="rounded-xl border bg-muted/20 p-4"><legend className="px-2 text-sm font-black">{title}</legend><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Address line 1" value={value.line1} onChange={(event) => update("line1", event.target.value)} /><Input placeholder="Address line 2 (optional)" value={value.line2} onChange={(event) => update("line2", event.target.value)} /><Input placeholder="City" value={value.city} onChange={(event) => update("city", event.target.value)} /><Input placeholder="State / region" value={value.region} onChange={(event) => update("region", event.target.value)} /><Input placeholder="Postal code" value={value.postalCode} onChange={(event) => update("postalCode", event.target.value)} /><Input disabled value={value.country} aria-label="Address country" /></div></fieldset>;
}
