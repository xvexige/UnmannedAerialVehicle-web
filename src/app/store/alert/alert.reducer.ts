import { createReducer, on } from '@ngrx/store';
import { Alert } from '../../shared/models/api.model';
import { AlertActions } from './alert.actions';

export interface AlertState {
  recentAlerts: Alert[];
  unreadCount: number;
}

const initialState: AlertState = {
  recentAlerts: [],
  unreadCount: 0,
};

export const alertReducer = createReducer(
  initialState,
  on(AlertActions.newAlert, (state, { alert }) => ({
    ...state,
    recentAlerts: [alert, ...state.recentAlerts].slice(0, 50),
    unreadCount: state.unreadCount + 1,
  })),
  on(AlertActions.setUnreadCount, (state, { count }) => ({
    ...state, unreadCount: count,
  })),
  on(AlertActions.clearAlerts, () => ({ ...initialState })),
);
