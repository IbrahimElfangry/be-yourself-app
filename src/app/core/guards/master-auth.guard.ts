import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const masterAuthGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isMaster()) {
    return true;
  }

  // Check query params e.g. ?pin=0510 or ?key=master
  const key = route.queryParams['key'] || route.queryParams['pin'];
  if (key && auth.unlockMaster(key)) {
    return true;
  }

  // Unauthorized guest device: redirect to read-only live stream route
  return router.createUrlTree(['/live-stream']);
};

