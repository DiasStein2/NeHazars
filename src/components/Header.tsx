import { Link, useLocation } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground">
            DataViz
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Upload
          </Link>
          <Link
            to="/analytics"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/analytics"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Analytics
          </Link>
        </nav>
      </div>
    </header>
  );
}
