import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { TenantRole } from '../models/models';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const moduleKey = route.data?.['module'] as string | undefined;
  if (moduleKey && !authService.canAccessModule(moduleKey)) {
    const currentDept = authService.currentUser?.departmentName || authService.currentDepartmentCode || 'Department';
    toastService.warning(
      'Access Restricted',
      `Department segregation active: ${currentDept} personnel do not have clearance for the ${moduleKey.toUpperCase()} module.`
    );

    if (authService.currentDepartmentCode === 'HR') {
      router.navigate(['/app/hr']);
    } else if (authService.currentDepartmentCode === 'FIN') {
      router.navigate(['/app/finance']);
    } else {
      router.navigate(['/app/dashboard']);
    }
    return false;
  }

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
