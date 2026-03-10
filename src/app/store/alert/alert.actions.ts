import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Alert } from '../../shared/models/api.model';

export const AlertActions = createActionGroup({
  source: 'Alert',
  events: {
    'New Alert': props<{ alert: Alert & { tenant_id: string } }>(),
    'Set Unread Count': props<{ count: number }>(),
    'Clear Alerts': emptyProps(),
  },
});
