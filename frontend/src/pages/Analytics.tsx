import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FileText, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { DataTable } from "@/components/DataTable";
import { DashboardFilters } from "@/components/DashboardFilters";
import { apiService, type AnalyticsData } from "@/services/api";
import { format } from "date-fns";

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId") || "latest";
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    users: { id: string; name: string }[];
    categories: string[];
  }>({ users: [], categories: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const analyticsData = await apiService.getAnalytics(fileId);
        setData(analyticsData);
        setFilterOptions({
          users: analyticsData.tableData.map((row) => ({
            id: row.id,
            name: row.name,
          })),
          categories: analyticsData.categoryDistribution.map((entry) => entry.name),
        });
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fileId]);

  const handleFilterChange = async (filters: {
    dateRange?: { from?: Date; to?: Date };
    userId?: string;
    category?: string;
  }) => {
    // In production, this would trigger a new API call with filters
    console.log("Filters changed:", filters);
    // const newData = await apiService.getAnalytics(fileId, filters);
    // setData(newData);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="text-muted-foreground mb-4">No data available</p>
          <Button asChild>
            <Link to="/">Upload a file</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tableColumns = [
    { key: "name", label: "User", sortable: true },
    {
      key: "messages",
      label: "Messages",
      sortable: true,
      format: (val: unknown) => new Intl.NumberFormat("en-US").format(val as number),
    },
    {
      key: "replies",
      label: "Replies",
      sortable: true,
      format: (val: unknown) => new Intl.NumberFormat("en-US").format(val as number),
    },
    {
      key: "contribution",
      label: "Contribution",
      sortable: true,
      format: (val: unknown) => `${Number(val).toFixed(2)}%`,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Upload
            </Link>
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {data.fileInfo.name}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Uploaded {format(new Date(data.fileInfo.uploadedAt), "MMMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>

            <DashboardFilters
              options={filterOptions}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {data.kpis.map((kpi) => (
            <KPICard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              changeType={kpi.changeType}
              format={kpi.format}
            />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <LineChart data={data.timeSeriesData} title="Messages Over Time" />
          <DonutChart
            data={data.categoryDistribution}
            title="Message Types"
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BarChart data={data.topUsers} title="Top Users" horizontal />
          <BarChart
            data={data.weekdayActivity}
            title="Weekday Activity"
            horizontal={false}
          />
        </div>

        {/* Top Words + Emojis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card-elevated p-6 animate-slide-up">
            <h3 className="text-base font-semibold text-foreground mb-4">Top Words</h3>
            {data.topWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No words available.</p>
            ) : (
              <div className="space-y-2">
                {data.topWords.slice(0, 12).map((entry, index) => (
                  <div
                    key={`${entry.word}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{entry.word}</span>
                    <span className="text-muted-foreground">
                      {new Intl.NumberFormat("en-US").format(entry.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card-elevated p-6 animate-slide-up">
            <h3 className="text-base font-semibold text-foreground mb-4">Top Emojis</h3>
            {data.topEmojis.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emojis available.</p>
            ) : (
              <div className="space-y-2">
                {data.topEmojis.slice(0, 12).map((entry, index) => (
                  <div
                    key={`${entry.emoji}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{entry.emoji}</span>
                    <span className="text-muted-foreground">
                      {new Intl.NumberFormat("en-US").format(entry.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={data.tableData}
          columns={tableColumns}
          title="User Breakdown"
          searchPlaceholder="Search users..."
        />
      </div>
    </div>
  );
}
