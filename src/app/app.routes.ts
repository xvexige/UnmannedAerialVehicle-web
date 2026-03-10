import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./layout/enterprise-layout/enterprise-layout.component').then(m => m.EnterpriseLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'monitor',
        loadChildren: () => import('./features/monitor/monitor.routes').then(m => m.MONITOR_ROUTES),
      },
      {
        path: 'drones',
        loadChildren: () => import('./features/drones/drones.routes').then(m => m.DRONES_ROUTES),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then(m => m.TASKS_ROUTES),
      },
      {
        path: 'alerts',
        loadChildren: () => import('./features/alerts/alerts.routes').then(m => m.ALERTS_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['enterprise_admin'] },
        loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES),
      },
      {
        path: 'models',
        loadChildren: () => import('./features/models/models.routes').then(m => m.MODELS_ROUTES),
      },
      {
        path: 'quota',
        loadChildren: () => import('./features/quota/quota.routes').then(m => m.QUOTA_ROUTES),
      },
      {
        path: 'plans',
        loadChildren: () => import('./features/plans/plans.routes').then(m => m.PLANS_ROUTES),
      },
    ],
  },
  {
    path: 'platform',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['super_admin'] },
    loadChildren: () => import('./features/platform/platform.routes').then(m => m.PLATFORM_ROUTES),
  },
  {
    path: '403',
    loadComponent: () => import('./features/auth/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
