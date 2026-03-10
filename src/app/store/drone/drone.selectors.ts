import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DroneMapState } from './drone.reducer';

const selectDroneState = createFeatureSelector<DroneMapState>('drone');

export const selectDroneLocations = createSelector(selectDroneState, s => s.locations);
export const selectAllDrones = createSelector(selectDroneState, s => s.drones);
