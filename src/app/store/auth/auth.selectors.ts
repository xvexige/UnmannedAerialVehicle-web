import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(selectAuthState, s => s.user);
export const selectIsLoggedIn = createSelector(selectAuthState, s => s.isLoggedIn);
export const selectUserRole = createSelector(selectAuthState, s => s.user?.role);
