import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './lib/mongoose.js';
import bcrypt from 'bcrypt';
import { User } from './models/user.model.js';

const PORT = Number(process.env.PORT ?? 3000);
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/proyecto-semana-08';

async function seedUsers(): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) return;

  const password1 = await bcrypt.hash('User1234!', 12);
  const password2 = await bcrypt.hash('Admin1234!', 12);

  await User.insertMany([
    { name: 'Regular User', email: 'user@test.com', password: password1, role: 'user' },
    { name: 'Admin User', email: 'admin@test.com', password: password2, role: 'admin' },
  ]);

  console.log('Seed: user@test.com / User1234! | admin@test.com / Admin1234!');
}

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);
  await seedUsers();

  app.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/v1/health`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
