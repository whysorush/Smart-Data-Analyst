export interface DataPoint {
  [key: string]: string | number | Date;
}

export interface Dataset {
  id: string;
  name: string;
  data: DataPoint[];
  columns: string[];
  uploadDate: Date;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  deadline: Date;
  status: 'on-track' | 'at-risk' | 'off-track';
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'prediction';
  confidence: number;
  timestamp: Date;
  relatedMetrics: string[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  xAxis: string;
  yAxis: string[];
  title: string;
}

export type Theme = 'light' | 'dark';