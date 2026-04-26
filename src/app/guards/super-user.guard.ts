import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

const SUPER_USER_EMAIL = 'etienne.darquennes@gmail.com';

export const superUserGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  const email = String(auth.user?.username ?? '').trim().toLowerCase();
  if (email === SUPER_USER_EMAIL) {
    return true;
  }

  return router.createUrlTree(['/']);
};
