import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title,
  description,
  onRetry,
  onHome,
  onBack,
  compact = false,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  onHome?: () => void;
  onBack?: () => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full items-center justify-center px-6 ${compact ? "py-10" : "min-h-[55vh] py-16"}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" /> Go back
            </Button>
          )}
          {onHome && (
            <Button variant="outline" onClick={onHome}>
              <Home className="size-4" /> Go home
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}