export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

export interface PageData<T = any> {
  total: number;
  page: number;
  size: number;
  list: T[];
}

export interface UserInfo {
  id: string;
  username: string;
  real_name: string;
  role: 'super_admin' | 'enterprise_admin' | 'pilot' | 'analyst';
  tenant_id: string | null;
  avatar_url: string | null;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserInfo;
}

export interface Drone {
  id: string;
  name: string;
  sn: string;
  model: string | null;
  status: 'online' | 'offline' | 'in_task';
  battery_level: number | null;
  longitude: number | null;
  latitude: number | null;
  altitude: number | null;
  compute_mode: 'cloud' | 'edge';
  last_heartbeat_at: string | null;
  stream_url?: string | null;
  current_task_id?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  name: string;
  drone_id: string;
  assignee_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  description?: string | null;
  model_id?: string | null;
  waypoints?: Waypoint[];
}

export interface Waypoint {
  seq: number;
  longitude: number;
  latitude: number;
  altitude: number;
}

export interface Alert {
  id: string;
  type: 'illegal_parking' | 'congestion' | 'intrusion' | 'other';
  description: string | null;
  level: 'info' | 'warning' | 'critical';
  status: 'unread' | 'read' | 'resolved';
  drone_id: string | null;
  task_id: string | null;
  snapshot_url: string | null;
  triggered_at: string;
  longitude?: number | null;
  latitude?: number | null;
  object_type?: string | null;
  confidence?: number | null;
}

export interface Report {
  id: string;
  task_id: string;
  drone_id: string;
  flight_duration_min: number;
  flight_distance_km: number;
  vehicle_count: number;
  pedestrian_count: number;
  alert_count: number;
  peak_congestion_index: number;
  created_at: string;
  timeline?: TimelinePoint[];
  snapshots?: SnapshotItem[];
}

export interface TimelinePoint {
  time_point: string;
  vehicle_count: number;
  pedestrian_count: number;
  congestion_index: number;
}

export interface SnapshotItem {
  snapshot_url: string;
  description: string | null;
  captured_at: string;
}

export interface DashboardOverview {
  total_flights_today: number;
  online_drones: number;
  offline_drones: number;
  total_drones: number;
  total_detections_today: number;
  unread_alerts: number;
  total_tasks_today: number;
}

export interface TelemetryData {
  drone_id: string;
  battery_level: number | null;
  speed_ms: number | null;
  altitude: number | null;
  longitude: number | null;
  latitude: number | null;
  signal_strength: number | null;
  recorded_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  scene: string;
  description: string | null;
  map50: number | null;
  miss_rate: number | null;
  fps: number | null;
  is_default: boolean;
  published_at: string | null;
}
