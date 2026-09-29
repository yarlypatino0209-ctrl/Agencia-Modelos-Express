import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { sanitizeInputs } from './middlewares/sanitizeInputs.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import modeloRoutes from './routes/modelo.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { globalLimiter, corsOptions } from './config/security.js';

const app = express();

// Security layers — order matters
app.use(helmet());
app.use(globalLimiter);
// Preflight CORS. En Express 5 '*' ya no es válido (path-to-regexp v8),
// se usa regex para cubrir todas las rutas.
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize inputs AFTER parsing, BEFORE routes
// (adaptador Express 5 sobre express-mongo-sanitize — ver middlewares/sanitizeInputs.ts)
app.use(sanitizeInputs);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
// Recurso principal: fichas de modelos de la agencia
app.use('/api/v1/modelos', modeloRoutes);

// Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export { app };
