import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function StudentConfirmLoginPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const started = useRef(false);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Validating your one-time link…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(search).get("token");
    if (!token) { setState("error"); setMessage("The confirmation link is incomplete."); return; }
    fetch("/api/student-auth/confirm", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Confirmation failed"); return body; })
      .then(() => { sessionStorage.removeItem("student-confirmation-email"); queryClient.invalidateQueries({ queryKey: ["/api/student-auth/status"] }); setState("success"); setMessage("Student access verified. Redirecting…"); window.setTimeout(() => setLocation("/student/dashboard"), 800); })
      .catch((error) => { setState("error"); setMessage(error.message); });
  }, [search, setLocation]);

  const Icon = state === "loading" ? Loader2 : state === "success" ? CheckCircle : XCircle;
  return <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center"><Icon className={`h-10 w-10 ${state === "loading" ? "animate-spin text-primary" : state === "success" ? "text-green-600" : "text-destructive"}`} /><h1 className="mt-4 text-2xl font-bold">Student login confirmation</h1><p role="status" className="mt-2 text-sm text-muted-foreground">{message}</p>{state === "error" && <a className="mt-6 text-sm text-primary underline" href="/student/login">Start a new student login</a>}</main>;
}
