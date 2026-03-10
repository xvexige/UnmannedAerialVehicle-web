export enum MapType {
  /** 全局驾驶舱大屏地图（/dashboard） */
  Global = 'global',
  /** 单机监控舱地图（/monitor/:droneId） */
  DroneDetail = 'drone_detail',
}

export interface DroneMapMarker {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  status: 'online' | 'offline' | 'in_task';
  battery_level: number | null;
  pilot_name?: string | null;
}
