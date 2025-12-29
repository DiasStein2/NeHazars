import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface FilterOptions {
  users: { id: string; name: string }[];
  categories: string[];
}

interface DashboardFiltersProps {
  options: FilterOptions;
  onFilterChange: (filters: {
    dateRange?: DateRange;
    userId?: string;
    category?: string;
  }) => void;
  className?: string;
}

export function DashboardFilters({
  options,
  onFilterChange,
  className,
}: DashboardFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [userId, setUserId] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onFilterChange({ dateRange: range, userId: userId || undefined, category: category || undefined });
  };

  const handleUserChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setUserId(newValue);
    onFilterChange({ dateRange, userId: newValue || undefined, category: category || undefined });
  };

  const handleCategoryChange = (value: string) => {
    const newValue = value === "all" ? "" : value;
    setCategory(newValue);
    onFilterChange({ dateRange, userId: userId || undefined, category: newValue || undefined });
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setUserId("");
    setCategory("");
    onFilterChange({});
  };

  const hasActiveFilters = dateRange || userId || category;

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters:</span>
      </div>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              "Date range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* User Selector */}
      <Select value={userId || "all"} onValueChange={handleUserChange}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="All users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All users</SelectItem>
          {options.users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category Selector */}
      <Select value={category || "all"} onValueChange={handleCategoryChange}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {options.categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
          onClick={clearFilters}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
