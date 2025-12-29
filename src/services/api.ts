/**
 * API Service Layer
 * 
 * This module provides a clean interface for all backend API calls.
 * Replace the placeholder implementations with your actual API endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
  tableData: TableRow[];
}

export interface KPIData {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
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

export interface TableRow {
  id: string;
  [key: string]: string | number | boolean;
}

export interface FilterOptions {
  dateRange?: { start: Date; end: Date };
  userId?: string;
  category?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload a file to the backend
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    // For actual implementation, use XMLHttpRequest or fetch with streaming
    // to track upload progress
    
    const formData = new FormData();
    formData.append('file', file);

    // Simulated progress for demo purposes
    // Replace with actual upload logic
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress(progress);
      }, 200);
    }

    // Replace with actual API call:
    // return this.request<UploadResponse>('/upload', {
    //   method: 'POST',
    //   body: formData,
    //   headers: {}, // Don't set Content-Type for FormData
    // });

    // Placeholder response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          fileId: 'file_' + Date.now(),
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        });
      }, 2000);
    });
  }

  /**
   * Fetch analytics data for a specific file
   */
  async getAnalytics(fileId: string, filters?: FilterOptions): Promise<AnalyticsData> {
    // Replace with actual API call:
    // const queryParams = new URLSearchParams();
    // if (filters?.dateRange) {
    //   queryParams.set('startDate', filters.dateRange.start.toISOString());
    //   queryParams.set('endDate', filters.dateRange.end.toISOString());
    // }
    // if (filters?.userId) queryParams.set('userId', filters.userId);
    // if (filters?.category) queryParams.set('category', filters.category);
    // 
    // return this.request<AnalyticsData>(`/analytics/${fileId}?${queryParams}`);

    // Placeholder data for demo
    return this.getMockAnalyticsData(fileId);
  }

  /**
   * Get available filter options (users, categories, etc.)
   */
  async getFilterOptions(fileId: string): Promise<{
    users: { id: string; name: string }[];
    categories: string[];
  }> {
    // Replace with actual API call:
    // return this.request(`/analytics/${fileId}/filters`);

    return {
      users: [
        { id: 'user1', name: 'John Doe' },
        { id: 'user2', name: 'Jane Smith' },
        { id: 'user3', name: 'Mike Johnson' },
      ],
      categories: ['Sales', 'Marketing', 'Engineering', 'Support', 'Operations'],
    };
  }

  private getMockAnalyticsData(fileId: string): AnalyticsData {
    return {
      fileInfo: {
        id: fileId,
        name: 'analytics_report_2024.csv',
        uploadedAt: new Date().toISOString(),
        size: 2457600,
      },
      kpis: [
        { id: '1', label: 'Total Records', value: 12847, change: 12.5, changeType: 'increase', format: 'number' },
        { id: '2', label: 'Active Users', value: 3241, change: 8.2, changeType: 'increase', format: 'number' },
        { id: '3', label: 'Revenue', value: 847500, change: -2.4, changeType: 'decrease', format: 'currency' },
        { id: '4', label: 'Conversion Rate', value: 24.8, change: 5.1, changeType: 'increase', format: 'percentage' },
      ],
      timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 500) + 200,
      })),
      categoryDistribution: [
        { name: 'Sales', value: 35, color: 'hsl(175, 70%, 35%)' },
        { name: 'Marketing', value: 25, color: 'hsl(200, 70%, 45%)' },
        { name: 'Engineering', value: 20, color: 'hsl(220, 60%, 50%)' },
        { name: 'Support', value: 12, color: 'hsl(38, 92%, 50%)' },
        { name: 'Operations', value: 8, color: 'hsl(150, 60%, 40%)' },
      ],
      topUsers: [
        { id: '1', name: 'Sarah Connor', value: 2847 },
        { id: '2', name: 'John Smith', value: 2341 },
        { id: '3', name: 'Emily Davis', value: 1987 },
        { id: '4', name: 'Michael Brown', value: 1654 },
        { id: '5', name: 'Jessica Wilson', value: 1432 },
      ],
      tableData: Array.from({ length: 20 }, (_, i) => ({
        id: `row_${i + 1}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        user: ['Sarah Connor', 'John Smith', 'Emily Davis', 'Michael Brown', 'Jessica Wilson'][i % 5],
        category: ['Sales', 'Marketing', 'Engineering', 'Support', 'Operations'][i % 5],
        value: Math.floor(Math.random() * 1000) + 100,
        status: ['Completed', 'Pending', 'Processing'][i % 3],
      })),
    };
  }
}

export const apiService = new ApiService();
