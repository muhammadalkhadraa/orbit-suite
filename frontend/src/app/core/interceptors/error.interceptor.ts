import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid session
        authService.logout();
        toastService.warning('Session Expired', 'Your authentication session has expired. Please sign in again.');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // Forbidden action based on role
        const msg = error.error?.message || 'Your role does not possess permissions for this operation.';
        toastService.error('Access Denied', msg);
      }

      return throwError(() => error);
    })
  );
};
