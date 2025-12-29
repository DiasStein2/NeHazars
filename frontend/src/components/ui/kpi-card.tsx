import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
  className?: string;
}

export function KPICard({
  label,
  value,
  change,
  changeType = 'neutral',
  format = 'number',
  className,
}: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const TrendIcon = changeType === 'increase' ? TrendingUp : 
                    changeType === 'decrease' ? TrendingDown : Minus;

  return (
    <div className={cn("card-elevated p-6 animate-fade-in", className)}>
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {formatValue(value)}
        </p>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md",
              changeType === 'increase' && "text-success bg-success/10",
              changeType === 'decrease' && "text-destructive bg-destructive/10",
              changeType === 'neutral' && "text-muted-foreground bg-muted"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
