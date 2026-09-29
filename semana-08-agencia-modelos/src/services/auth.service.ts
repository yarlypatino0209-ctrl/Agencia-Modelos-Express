import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../errors/AppError.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdWithRefreshToken,
  updateRefreshToken,
} from '../repositories/users.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import type { RegisterDto, LoginDto } from '../schemas/auth.schema.js';

// ── Hash de refresh tokens ────────────────────────────────────────────────────
// Se almacena el hash SHA-256, nunca el token en claro. No se usa bcrypt
// porque trunca la entrada a 72 bytes y dos refresh JWT del mismo usuario
// solo difieren después del byte ~86 (mismo header + sub): bcrypt los
// consideraría iguales y rompería la rotación. Las contraseñas sí usan
// bcrypt (ver register/login).
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenMatches(incomingToken: string, storedHash: string): boolean {
  const incomingHash = hashRefreshToken(incomingToken);
  const a = Buffer.from(incomingHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function register(dto: RegisterDto) {
  const existing = await findUserByEmail(dto.email);
  if (existing) throw new AppError(409, 'Email already registered');

  const hashed = await bcrypt.hash(dto.password, 12);
  const user = await createUser({ ...dto, password: hashed });
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function login(dto: LoginDto) {
  const user = await findUserByEmail(dto.email);
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user._id.toString());
  // Solo el hash llega a la DB — nunca el token en claro
  await updateRefreshToken(user._id.toString(), hashRefreshToken(refreshToken));

  return { accessToken, refreshToken, role: user.role };
}

export async function refreshTokens(token: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await findUserByIdWithRefreshToken(payload.sub);
  if (!user) throw new AppError(401, 'User not found');

  // El token presentado debe coincidir con el hash almacenado.
  // Sin esta verificación, un refresh anterior seguiría válido
  // después de rotar o de hacer logout.
  if (!user.refreshToken || !refreshTokenMatches(token, user.refreshToken)) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  // Rotación: el nuevo refresh invalida al anterior
  const newRefreshToken = signRefreshToken(user._id.toString());
  await updateRefreshToken(user._id.toString(), hashRefreshToken(newRefreshToken));

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  await updateRefreshToken(userId, null);
}

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}
