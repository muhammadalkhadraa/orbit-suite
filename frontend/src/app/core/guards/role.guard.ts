import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { TenantRole } from '../models/models';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const allowedRoles = route.data?.['roles'] as TenantRole[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const currentRole = authService.currentRole;

  if (currentRole && allowedRoles.includes(currentRole)) {
    return true;
  }

  // Not authorized for this specific role scope
  toastService.warning(
    'Access Restricted',
    `Your active permission scope (${currentRole || 'Guest'}) does not have clearance for this module.`
  );

  router.navigate(['/app/dashboard']);
  return false;
};
