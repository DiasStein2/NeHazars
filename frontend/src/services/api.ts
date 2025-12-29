/**
 * API Service Layer
 *
 * This module provides a clean interface for backend API calls.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_FILE_ID = "latest";
const UPLOAD_META_KEY = "telegramUploadMeta";

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  uploadedAt: string;
  message?: string;
}

export interface AnalyticsData {
  fileInfo: {
    id: string;
    name: string;
    uploadedAt: string;
    size: number;
  };
  kpis: KPIData[];
  timeSeriesData: TimeSeriesPoint[];
  categoryDistribution: CategoryData[];
  topUsers: UserData[];
  weekdayActivity: Array<{ name: string; value: number }>;
  topWords: Array<{ word: string; count: number }>;
  topEmojis: Array<{ emoji: string; count: number }>;
  tableData: UserTableRow[];
}

export interface KPIData {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  format?: "number" | "currency" | "percentage";
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

export interface UserData {
  id: string;
  name: string;
  value: number;
  avatar?: string;
}

export interface UserTableRow {
  id: string;
  name: string;
  messages: number;
  replies: number;
  contribution: number;
}

export interface FilterOptions {
  dateRange?: { from?: Date; to?: Date };
  userId?: string;
  category?: string;
}

interface UploadApiResponse {
  status: string;
  filename: string;
  filenames?: string[];
  fileCount?: number;
  message?: string;
  summary?: SummaryResponse;
}

interface SummaryResponse {
  totalMessages: number;
  totalUsers: number;
  activeDays: number;
  peakActivityDate: string;
  peakMessageCount: number;
}

interface ActivityResponse {
  timeline: Array<{ date: string; messages: number }>;
  hourly: Array<{ hour: number; label: string; count: number }>;
  weekday: Array<{ day: string; count: number }>;
}

type UsersResponse = Array<{
  id: number | string;
  name: string;
  messages: number;
  replies: number;
  contribution: number;
}>;

interface ContentResponse {
  types: Array<{ name: string; value: number }>;
  lengthDist: Array<{ range: string; count: number }>;
  emojis: Array<{ emoji: string; count: number }>;
  topWords: Array<{ word: string; count: number }>;
  inactiveDays: string[];
}

interface UploadMeta {
  id: string;
  name: string;
  uploadedAt: string;
  size: number;
}

const saveUploadMeta = (meta: UploadMeta) => {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(UPLOAD_META_KEY, JSON.stringify(meta));
};

const loadUploadMeta = (fileId: string) => {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(UPLOAD_META_KEY);
  if (!raw) {
    return null;
  }
  try {
    const meta = JSON.parse(raw) as UploadMeta;
    if (meta.id !== fileId) {
      return null;
    }
    return meta;
  } catch {
    return null;
  }
};

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!headers.has("Content-Type") && !isFormData) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    if (!response.ok) {
      let message = response.statusText;
      if (text) {
        try {
          const parsed = JSON.parse(text) as { detail?: string; message?: string };
          message = parsed.detail || parsed.message || message;
        } catch {
          message = text;
        }
      }
      throw new Error(message);
    }

    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Upload a Telegram HTML export to the backend.
   */
  async uploadFile(
    files: File[] | File,
    _onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const fileList = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("files", file);
    });

    const response = await this.request<UploadApiResponse>("/upload", {
      method: "POST",
      body: formData,
      headers: {},
    });

    const fileId = DEFAULT_FILE_ID;
    const uploadedAt = new Date().toISOString();
    const fallbackName =
      fileList.length > 1 ? `${fileList.length} files` : fileList[0]?.name || "upload";
    const fileName = response.filename || fallbackName;
    const totalSize = fileList.reduce((sum, file) => sum + file.size, 0);

    saveUploadMeta({
      id: fileId,
      name: fileList.length > 1 ? `Telegram export (${fileList.length} files)` : fileName,
      uploadedAt,
      size: totalSize,
    });

    return {
      success: response.status === "ok",
      fileId,
      fileName,
      uploadedAt,
      message: response.message,
    };
  }

  /**
   * Fetch analytics data for the latest upload.
   */
  async getAnalytics(fileId: string, _filters?: FilterOptions): Promise<AnalyticsData> {
    const [summary, activity, users, content] = await Promise.all([
      this.request<SummaryResponse>("/stats/summary"),
      this.request<ActivityResponse>("/stats/activity"),
      this.request<UsersResponse>("/stats/users"),
      this.request<ContentResponse>("/stats/content"),
    ]);

    const uploadMeta = loadUploadMeta(fileId) || {
      id: fileId,
      name: "Telegram chat export",
      uploadedAt: new Date().toISOString(),
      size: 0,
    };

    return {
      fileInfo: {
        id: uploadMeta.id,
        name: uploadMeta.name,
        uploadedAt: uploadMeta.uploadedAt,
        size: uploadMeta.size,
      },
      kpis: [
        {
          id: "total-messages",
          label: "Total Messages",
          value: summary.totalMessages,
          format: "number",
        },
        {
          id: "active-users",
          label: "Active Users",
          value: summary.totalUsers,
          format: "number",
        },
        {
          id: "active-days",
          label: "Active Days",
          value: summary.activeDays,
          format: "number",
        },
        {
          id: "peak-messages",
          label: "Peak Messages",
          value: summary.peakMessageCount,
          format: "number",
        },
      ],
      timeSeriesData: activity.timeline.map((entry) => ({
        date: entry.date,
        value: entry.messages,
      })),
      categoryDistribution: content.types.map((entry) => ({
        name: entry.name,
        value: entry.value,
      })),
      topUsers: users.slice(0, 8).map((user) => ({
        id: String(user.id),
        name: user.name,
        value: user.messages,
      })),
      weekdayActivity: activity.weekday.map((entry) => ({
        name: entry.day,
        value: entry.count,
      })),
      topWords: content.topWords,
      topEmojis: content.emojis,
      tableData: users.map((user) => ({
        id: String(user.id),
        name: user.name,
        messages: user.messages,
        replies: user.replies,
        contribution: user.contribution,
      })),
    };
  }

  /**
   * Get available filter options (users, categories).
   */
  async getFilterOptions(_fileId: string): Promise<{
    users: { id: string; name: string }[];
    categories: string[];
  }> {
    const [users, content] = await Promise.all([
      this.request<UsersResponse>("/stats/users"),
      this.request<ContentResponse>("/stats/content"),
    ]);

    return {
      users: users.map((user) => ({ id: String(user.id), name: user.name })),
      categories: content.types.map((entry) => entry.name),
    };
  }
}

export const apiService = new ApiService();
