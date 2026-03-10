import { createReducer, on } from '@ngrx/store';
import { UserInfo } from '../../shared/models/api.model';
import { AuthActions } from './auth.actions';

export interface AuthState {
  user: UserInfo | null;
  isLoggedIn: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state, user, isLoggedIn: true,
  })),
  on(AuthActions.restoreSession, (state, { user }) => ({
    ...state, user, isLoggedIn: true,
  })),
  on(AuthActions.logout, () => initialState),
);
