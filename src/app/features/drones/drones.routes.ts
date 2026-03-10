import { Routes } from '@angular/router';

export const DRONES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./drones.component').then(m => m.DronesComponent) },
];
