import { CheckCircle2, Circle } from "lucide-react";

type CompletionProfile = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  role?: string | null;
  profileComplete?: boolean | null;
};

export type ProfileCompletionItem = { label: string; description: string; complete: boolean };

export function getProfileCompletionItems(profile: CompletionProfile | null | undefined): ProfileCompletionItem[] {
  const isSeller = profile?.role === "farmer";
  const hasName = Boolean(profile?.name?.trim() || profile?.firstName?.trim());
  const hasContact = Boolean(profile?.email?.trim() || profile?.phone?.trim());
  const hasLocation = Boolean(profile?.location?.trim());
  const hasSellerDetails = Boolean(profile?.profileComplete || (profile?.name?.trim() && profile?.location?.trim()));
  const items = [
    { label: "Add your name", description: "Used to personalise your profile.", complete: hasName },
    { label: "Add contact details", description: "Keep an email address or phone number on your account.", complete: hasContact },
    { label: "Add your location", description: "Help show relevant local marketplace information.", complete: hasLocation },
    { label: "Confirm your account type", description: "Buyer is the safe default until you choose a seller role.", complete: Boolean(profile?.role) },
  ];
  if (isSeller) items.push({ label: "Add seller details", description: "Complete the seller details in your profile.", complete: hasSellerDetails });
  return items;
}

export function ProfileCompletionChecklist({ profile, compact = false }: { profile: CompletionProfile | null | undefined; compact?: boolean }) {
  const items = getProfileCompletionItems(profile);
  const completed = items.filter((item) => item.complete).length;
  const percent = items.length === 0 ? 0 : Math.round((completed / items.length) * 100);

  return (
    <section aria-labelledby="profile-completion-heading" data-testid="profile-completion-checklist">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="profile-completion-heading" className="font-semibold">Profile completion</h2>
          <p className="text-sm text-muted-foreground">Optional steps — you can continue using AgriConnect at any time.</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary" data-testid="profile-completion-progress">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-label={`${percent}% profile complete`}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      {!compact && <div className="mt-4 space-y-2">
        {items.map((item) => <div key={item.label} className="flex gap-3 rounded-md border p-3" data-testid={`profile-step-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
          {item.complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div><p className={item.complete ? "font-medium text-sm" : "font-medium text-sm text-muted-foreground"}>{item.label}</p><p className="text-xs text-muted-foreground">{item.description}</p></div>
        </div>)}
      </div>}
    </section>
  );
}
