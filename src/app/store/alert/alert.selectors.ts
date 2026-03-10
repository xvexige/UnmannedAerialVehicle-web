import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AlertState } from './alert.reducer';

const selectAlertState = createFeatureSelector<AlertState>('alert');

export const selectRecentAlerts = createSelector(selectAlertState, s => s.recentAlerts);
export const selectUnreadCount = createSelector(selectAlertState, s => s.unreadCount);
