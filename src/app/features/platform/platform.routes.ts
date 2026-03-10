import { Routes } from '@angular/router';

export const PLATFORM_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./platform.component').then(m => m.PlatformComponent) },
];
