import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

// ============================================
// Sanitización anti NoSQL-injection (Express 5)
// ============================================
// El middleware de express-mongo-sanitize v2 reasigna req.query,
// lo que lanza TypeError en Express 5 (req.query es solo-getter).
// Este adaptador reutiliza su función pura sanitize() para body
// y params (reasignables) y limpia la query in-place (sin reasignar).
// ============================================

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = mongoSanitize.sanitize(req.body);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = mongoSanitize.sanitize(req.params);
  }

  // In-place: nunca reasignar req.query en Express 5
  stripProhibitedKeys(req.query);

  next();
}

// Elimina recursivamente claves con `$` o `.` (operadores de MongoDB)
function stripProhibitedKeys(value: unknown): void {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach(stripProhibitedKeys);
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete record[key];
    } else {
      stripProhibitedKeys(record[key]);
    }
  }
}
