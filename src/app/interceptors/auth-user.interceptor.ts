import { HttpInterceptorFn } from '@angular/common/http';

const AUTH_STORAGE_KEY = 'pg_auth_session';

function readCurrentUserId(): string {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { user?: { id?: unknown } };
    return String(parsed?.user?.id ?? '').trim();
  } catch {
    return '';
  }
}

export const authUserInterceptor: HttpInterceptorFn = (req, next) => {
  const userId = readCurrentUserId();
  if (!userId) return next(req);

  return next(
    req.clone({
      setHeaders: { 'X-User-Id': userId },
    })
  );
};
