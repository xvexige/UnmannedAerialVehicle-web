import { Routes } from '@angular/router';

export const QUOTA_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./quota.component').then(m => m.QuotaComponent) },
];
