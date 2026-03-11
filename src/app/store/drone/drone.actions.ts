import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const DroneActions = createActionGroup({
  source: 'Drone',
  events: {
    'Update Location': props<{ telemetry: {
      drone_id: string;
      longitude: number | null;
      latitude: number | null;
      altitude: number | null;
      battery_level: number | null;
    }}>(),
    'Set Drones': props<{ drones: any[] }>(),
    'Reload Drones': emptyProps(),
  },
});
