import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../errors/AppError';
import * as usersRepository from '../repositories/users.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RegisterDto, LoginDto } from '../schemas/auth.schema';
import { IUser } from '../models/user.model';

const SALT_ROUNDS = 10;
const COOKIE_ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const COOKIE_REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

// ── Hash de refresh tokens ────────────────────────────────────────────────────
// Los refresh tokens se almacenan como hash SHA-256, nunca en texto plano.
//
// ¿Por qué NO bcrypt para los tokens? bcrypt solo usa los primeros 72 bytes
// de la entrada. Dos refresh JWT del mismo usuario comparten header + `sub`
// (~86 bytes idénticos) y solo difieren al final (iat/exp), por lo que
// bcrypt.compare() los consideraría IGUALES y la rotación quedaría rota:
// un token anterior seguiría siendo válido después de rotar.
// SHA-256 no tiene ese límite y distingue cualquier diferencia (avalancha).
// Las CONTRASEÑAS sí usan bcrypt (ver register/login), como corresponde.
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenMatches(incomingToken: string, storedHash: string): boolean {
  const incomingHash = hashRefreshToken(incomingToken);
  const a = Buffer.from(incomingHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface TokenCookieOptions {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

export async function register(dto: RegisterDto): Promise<IUser> {
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) throw new AppError(409, 'El email ya está registrado');

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return usersRepository.create({ ...dto, password: hashedPassword });
}

export async function login(dto: LoginDto): Promise<TokenCookieOptions> {
  const user = await usersRepository.findByEmailWithPassword(dto.email);

  // Mismo mensaje para email no encontrado Y contraseña incorrecta
  // — previene user enumeration attacks
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  const isMatch = await bcrypt.compare(dto.password, user.password);
  if (!isMatch) throw new AppError(401, 'Credenciales inválidas');

  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  // Almacenar HASH SHA-256 del refresh token — nunca el token en claro
  await usersRepository.updateRefreshToken(
    user._id.toString(),
    hashRefreshToken(refreshToken)
  );

  return {
    accessToken,
    refreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function refresh(incomingToken: string): Promise<TokenCookieOptions> {
  // 1. Verificar firma y expiración del refresh token
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(incomingToken) as { sub: string };
  } catch {
    throw new AppError(401, 'Refresh token inválido o expirado');
  }

  // 2. Cargar usuario con su hash de refresh token
  const user = await usersRepository.findByIdWithTokens(payload.sub);
  if (!user || !user.refreshToken) {
    throw new AppError(401, 'Sesión no válida');
  }

  // 3. Comparar token recibido con hash almacenado (comparación segura)
  if (!refreshTokenMatches(incomingToken, user.refreshToken)) {
    throw new AppError(401, 'Refresh token no coincide');
  }

  // 4. Rotar: generar nuevos tokens
  const newPayload = { sub: user._id.toString(), email: user.email, role: user.role };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken({ sub: user._id.toString() });

  // 5. Guardar nuevo hash, invalidar el anterior
  await usersRepository.updateRefreshToken(
    user._id.toString(),
    hashRefreshToken(newRefreshToken)
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function logout(userId: string): Promise<void> {
  // Invalidar refresh token en la base de datos
  await usersRepository.updateRefreshToken(userId, undefined);
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
}
