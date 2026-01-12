/**
 * Public routes accessible without authentication
 */
export const publicRoutes: string[] = [
  '/public',
  '/register',
  '/api/register',
];

/**
 * Auth routes - redirect to dashboard if already logged in
 */
export const authRoutes: string[] = [
  '/login',
];

/**
 * API auth prefix - excluded from middleware protection
 */
export const apiAuthPrefix = '/api/auth';

/**
 * Default redirect after login
 */
export const DEFAULT_LOGIN_REDIRECT = '/dashboard';
