import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { DroneActions } from '../../store/drone/drone.actions';
import { DashboardComponent } from './dashboard.component';

export const reloadDashboard = createEffect(
  (actions$ = inject(Actions), dashboard = inject(DashboardComponent)) => {
    return actions$.pipe(
      ofType(DroneActions.reloadDrones),
      tap(() => dashboard.loadData()),
    );
  },
  { functional: true, dispatch: false },
);
