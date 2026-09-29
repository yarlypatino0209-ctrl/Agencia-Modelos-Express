import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    res.json({
      message: 'Welcome to your dashboard',
      data: { userId: req.user.sub, email: req.user.email, role: req.user.role },
    });
  } catch (err) {
    next(err);
  }
}
