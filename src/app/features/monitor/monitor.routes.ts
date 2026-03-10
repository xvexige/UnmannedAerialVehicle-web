import { Routes } from '@angular/router';

export const MONITOR_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./monitor.component').then(m => m.MonitorComponent) },
  { path: ':droneId', loadComponent: () => import('./drone-cockpit/drone-cockpit.component').then(m => m.DroneCockpitComponent) },
];
