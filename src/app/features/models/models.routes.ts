import { Routes } from '@angular/router';

export const MODELS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./models.component').then(m => m.ModelsComponent) },
];
