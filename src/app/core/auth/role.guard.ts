import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data?.['roles'] ?? [];

  if (!allowedRoles.length) return true;

  if (auth.hasRole(...allowedRoles)) {
    return true;
  }
  router.navigate(['/403']);
  return false;
};
