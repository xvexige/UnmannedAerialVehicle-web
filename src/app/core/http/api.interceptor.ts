import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const isAbsolute = req.url.startsWith('http');
  const url = isAbsolute ? req.url : `${environment.apiBaseUrl}${req.url}`;

  const cloned = req.clone({
    url,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return next(cloned);
};
