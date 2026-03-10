import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const code = error.error?.code;
      const message = error.error?.message || '请求失败';

      if (error.status === 401 || code === 40101) {
        auth.clearSession();
        return throwError(() => error);
      }

      if (error.status === 403 || code === 40301) {
        router.navigate(['/403']);
        return throwError(() => error);
      }

      if (error.status >= 500) {
        console.error('服务器内部错误', message);
      }

      return throwError(() => ({ ...error, bizMessage: message }));
    })
  );
};
