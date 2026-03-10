import { createReducer, on } from '@ngrx/store';
import { DroneActions } from './drone.actions';

export interface DroneMapState {
  locations: Record<string, {
    drone_id: string;
    longitude: number | null;
    latitude: number | null;
    altitude: number | null;
    battery_level: number | null;
  }>;
  drones: any[];
}

const initialState: DroneMapState = {
  locations: {},
  drones: [],
};

export const droneReducer = createReducer(
  initialState,
  on(DroneActions.updateLocation, (state, { telemetry }) => ({
    ...state,
    locations: { ...state.locations, [telemetry.drone_id]: telemetry },
  })),
  on(DroneActions.setDrones, (state, { drones }) => ({
    ...state, drones,
  })),
);
