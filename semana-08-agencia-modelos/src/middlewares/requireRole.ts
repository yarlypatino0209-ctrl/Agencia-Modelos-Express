import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

// requireRole is a higher-order function that returns a RequestHandler.
// It verifies req.user.role against the allowed roles list.
// MUST always run AFTER authMiddleware (requires req.user populated).
export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role as string)) {
      return next(
        new AppError(403, `Access denied. Required roles: ${roles.join(', ')}`)
      );
    }

    next();
  };
}
