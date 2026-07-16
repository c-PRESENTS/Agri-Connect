import { MailCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentVerifyEmailPage() {
  const maskedEmail = sessionStorage.getItem("student-confirmation-email");
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><MailCheck className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-bold">Check your email</h1><p className="mt-2 text-sm text-muted-foreground">We sent a one-time student login link{maskedEmail ? ` to ${maskedEmail}` : " to your registered institutional email"}. The link expires shortly.</p><p className="mt-4 text-xs text-muted-foreground">Keep this browser signed in and open the link using the same Google account. If you did not request access, ignore the message.</p><a href="/student/login" className="mt-6 inline-block text-sm text-primary underline">Return to student login</a></CardContent></Card></main>;
}
