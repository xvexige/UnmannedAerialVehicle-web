import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { UserInfo } from '../../shared/models/api.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login Success': props<{ user: UserInfo }>(),
    'Logout': emptyProps(),
    'Restore Session': props<{ user: UserInfo }>(),
  },
});
