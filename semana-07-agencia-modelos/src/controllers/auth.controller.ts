import { Request, Response, NextFunction, CookieOptions } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const isProduction = process.env.NODE_ENV === 'production';

function setCookieOptions(maxAge: number, path = '/'): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path,
  };
}

function setTokenCookies(
  res: Response,
  tokens: Awaited<ReturnType<typeof authService.login>>
): void {
  res.cookie('accessToken', tokens.accessToken, setCookieOptions(tokens.accessMaxAge));
  res.cookie(
    'refreshToken',
    tokens.refreshToken,
    setCookieOptions(tokens.refreshMaxAge, '/api/v1/auth')
  );
}

function clearTokenCookies(res: Response): void {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const user = await authService.register(dto);
    res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const tokens = await authService.login(dto);
    setTokenCookies(res, tokens);
    res.status(200).json({ message: 'Login exitoso' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const user = await authService.getMe(userId);
    res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingToken = req.cookies?.refreshToken as string | undefined;
    if (!incomingToken) {
      res.status(401).json({ error: 'Refresh token no encontrado' });
      return;
    }
    const tokens = await authService.refresh(incomingToken);
    setTokenCookies(res, tokens);
    res.status(200).json({ message: 'Tokens renovados' });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    await authService.logout(userId);
    clearTokenCookies(res);
    res.status(200).json({ message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
}
