import { UserModel, IUser } from '../models/user.model';
import { RegisterDto } from '../schemas/auth.schema';

export async function findByEmail(email: string): Promise<IUser | null> {
  return UserModel.findOne({ email });
}

export async function findByEmailWithPassword(email: string): Promise<IUser | null> {
  // select: false en password requiere solicitarla explícitamente
  return UserModel.findOne({ email }).select('+password');
}

export async function findByIdWithTokens(id: string): Promise<IUser | null> {
  return UserModel.findById(id).select('+password +refreshToken');
}

export async function findById(id: string): Promise<IUser | null> {
  return UserModel.findById(id);
}

export async function create(dto: RegisterDto): Promise<IUser> {
  return UserModel.create(dto);
}

export async function updateRefreshToken(
  id: string,
  hashedToken: string | undefined
): Promise<void> {
  await UserModel.findByIdAndUpdate(id, { refreshToken: hashedToken ?? null });
}
