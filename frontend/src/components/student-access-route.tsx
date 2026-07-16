import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

type StudentStatus = { enabled: boolean; verified: boolean; demo?: boolean };

export function StudentAccessRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useQuery<StudentStatus>({ queryKey: ["/api/student-auth/status"] });

  useEffect(() => {
    if (!isLoading && data?.enabled && !data.verified) setLocation("/student/login");
  }, [data, isLoading, setLocation]);

  if (isLoading || (data?.enabled && !data.verified)) {
    return <div className="flex min-h-screen items-center justify-center" data-testid="loading-student-access"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (isError || !data?.enabled) {
    return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-bold">Student portal unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Student access has not been enabled for this environment.</p></main>;
  }
  return <>{children}</>;
}
