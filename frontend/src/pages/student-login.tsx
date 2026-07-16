import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

let studentGoogleClientId = "";
let studentCredentialHandler: (response: { credential?: string }) => void = () => undefined;

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Loading secure student sign-in...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/student-auth/status").then((response) => response.json()).then((status) => {
      setPortalEnabled(status.enabled);
      if (!status.enabled) setMessage("Student access has not been enabled for this environment.");
      else if (status.verified) setLocation("/student/dashboard");
    }).catch(() => { setPortalEnabled(false); setMessage("Unable to check student portal availability."); });
  }, [setLocation]);

  useEffect(() => {
    fetch("/api/config").then((response) => response.json()).then((config) => setClientId(config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "")).catch(() => undefined);
  }, []);

  const handleCredential = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) return setMessage("Google sign-in was not completed.");
    setIsSubmitting(true);
    try {
      const result = await fetch("/api/student-auth/google", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: response.credential }) });
      const body = await result.json();
      if (!result.ok) throw new Error(body.error || "Student sign-in failed");
      sessionStorage.setItem("student-confirmation-email", body.email);
      setLocation("/student/verify-email");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [setLocation]);

  useEffect(() => { studentCredentialHandler = handleCredential; }, [handleCredential]);
  useEffect(() => {
    if (portalEnabled !== true || !clientId || !buttonRef.current) return;
    let attempts = 0;
    const render = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !buttonRef.current) return false;
      if (!renderedRef.current || studentGoogleClientId !== clientId) {
        google.accounts.id.initialize({ client_id: clientId, callback: (response: { credential?: string }) => studentCredentialHandler(response), ux_mode: "popup", cancel_on_tap_outside: false });
        studentGoogleClientId = clientId;
      }
      if (!renderedRef.current) {
        buttonRef.current.replaceChildren();
        google.accounts.id.renderButton(buttonRef.current, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 320 });
        renderedRef.current = true;
      }
      setMessage("");
      return true;
    };
    if (render()) return;
    const timer = window.setInterval(() => { attempts += 1; if (render() || attempts >= 40) window.clearInterval(timer); }, 250);
    return () => window.clearInterval(timer);
  }, [clientId, portalEnabled]);

  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4"><Card className="w-full max-w-md"><CardHeader className="text-center"><GraduationCap className="mx-auto h-10 w-10 text-primary" /><CardTitle>Student login</CardTitle><p className="text-sm text-muted-foreground">Use the Google account listed in your institution's active student registry.</p></CardHeader><CardContent className="space-y-4">{portalEnabled === true && <div className="flex min-h-12 justify-center" ref={buttonRef} aria-label="Sign in with Google for student access" />}{isSubmitting && <p className="flex items-center justify-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Checking student eligibility…</p>}{message && <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>}<div className="flex gap-2 rounded-md border p-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><span>Google identity, active registry eligibility, and a one-time email confirmation are all required.</span></div><a className="block text-center text-sm text-primary underline" href="/login">Use marketplace login instead</a></CardContent></Card></main>;
}
