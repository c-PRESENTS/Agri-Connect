import { Link } from "wouter";
import { Home, ArrowLeft, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8"
        >
          <Leaf className="h-12 w-12 text-primary" />
        </motion.div>

        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold mb-2">{t("not_found.title")}</h2>
        
        <p className="text-muted-foreground mb-8">
          {t("not_found.description")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {t("not_found.go_back")}
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              {t("not_found.back_to_home")}
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t("not_found.tagline")}
        </p>
      </motion.div>
    </div>
  );
}
