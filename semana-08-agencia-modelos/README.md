# Proyecto Semana 08 — Agencia de Modelos · API Segura con RBAC

API REST de una **Agencia de Modelos** con autenticación JWT, autorización por roles (**RBAC**), cabeceras de seguridad (**Helmet**), **CORS con whitelist**, **rate limiting** diferenciado y **sanitización** contra NoSQL injection y XSS. Recurso principal: **fichas de modelos** (`Modelo`).

## 1. Dominio: Agencia de Modelos

La agencia representa modelos profesionales y expone su catálogo. Cada ficha (`Modelo`) contiene la información que un booker necesita para ofrecer talento a clientes.

### Recurso principal: `Modelo`

| Campo | Tipo | Descripción |
|---|---|---|
| `fullName` | string | Nombre completo (sin `<` `>` — anti XSS) |
| `code` | string (único) | Código de agencia `AAA-0000` (ej: `MDL-0001`), inmutable |
| `gender` | enum | `femenino` · `masculino` · `no-binario` |
| `birthDate` | fecha ISO | En el pasado, edad mínima 14 años |
| `height` | number | Estatura en cm (140–220) |
| `category` | enum | `pasarela` · `publicidad` · `editorial` · `fitness` · `plus-size` · `infantil` · `partes` |
| `experienceYears` | number | Años de experiencia (0–60) |
| `dailyRate` | number | Tarifa por día (> 0) |
| `portfolioUrl` | string? | URL del book |
| `phone` | string? | Teléfono de contacto |
| `status` | enum | `disponible` · `en-contrato` · `inactivo` |
| `active` | boolean | Ficha activa o archivada |
| `createdBy` | string | ID del usuario creador (para autorización por dueño) |

## 2. Roles y permisos (RBAC)

| Rol | Quién es | Permisos |
|---|---|---|
| — (público) | Visitantes, clientes potenciales | Ver catálogo: `GET /modelos`, `GET /modelos/:id` |
| `user` | Bookers / scouts de la agencia | Todo lo público + crear fichas + editar **sus propias** fichas |
| `admin` | Director/a de la agencia | Todo + editar **cualquier** ficha + **eliminar** fichas |

### Endpoints y acceso requerido

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/health` | Público |
| POST | `/api/v1/auth/register` | Público (rate limit: 5/15min) |
| POST | `/api/v1/auth/login` | Público (rate limit: 5/15min) |
| POST | `/api/v1/auth/refresh` | Refresh cookie |
| POST | `/api/v1/auth/logout` | Autenticado (Bearer) |
| GET | `/api/v1/auth/me` | Autenticado (Bearer) |
| GET | `/api/v1/users/dashboard` | Autenticado (Bearer) |
| GET | `/api/v1/modelos` | **Público** (filtros: `category`, `status`) |
| GET | `/api/v1/modelos/:id` | **Público** |
| POST | `/api/v1/modelos` | Autenticado |
| PATCH | `/api/v1/modelos/:id` | Autenticado + **dueño o admin** (403 si no) |
| DELETE | `/api/v1/modelos/:id` | Autenticado + **`admin`** (403 si no) |

> Autenticación: `Authorization: Bearer <accessToken>`. El refresh token viaja en cookie HttpOnly (`refreshToken`, 7 días).

## 3. Capas de seguridad

| Capa | Implementación | Dónde |
|---|---|---|
| Helmet | 12 cabeceras (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`...) | `app.ts` (antes de todo) |
| Rate limit global | 100 req / 15 min | `config/security.ts` → `app.ts` |
| Rate limit auth | 5 req / 15 min en `/register` y `/login` (anti fuerza bruta) | `config/security.ts` → `auth.routes.ts` |
| CORS whitelist | Solo `http://localhost:5173` y `http://localhost:3001`, `credentials: true` | `config/security.ts` |
| Sanitización NoSQL | `express-mongo-sanitize` vía adaptador Express 5 (body/params con `sanitize()` + query in-place; el middleware original v2 crashea en Express 5 al reasignar `req.query`) + chequeo de tipos en filtros | `middlewares/sanitizeInputs.ts` → `app.ts` |
| Anti XSS | Zod rechaza `<` `>` en textos + `phone`, `fullName` validados | `schemas/modelo.schema.ts` |
| RBAC | `authMiddleware` + `requireRole('admin')` + verificación de dueño en service | `routes/modelo.routes.ts`, `services/modelo.service.ts` |
| Hash de contraseñas | `bcrypt` (12 rounds) | `services/auth.service.ts` |
| Refresh hasheado + rotación | SHA-256 + `timingSafeEqual`; `/refresh` verifica contra la DB (logout invalida) | `services/auth.service.ts` |
| Errores seguros | Sin stack traces ni info interna (500 genérico) | `middlewares/errorHandler.ts` |
| Secretos | Todo en `.env`, nunca hardcodeados | `.env.example` |

## 4. Cómo ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Edita JWT_ACCESS_SECRET y JWT_REFRESH_SECRET con valores largos y distintos:
#   openssl rand -base64 64

# 3. Levantar MongoDB
docker compose up -d

# 4. Iniciar servidor
npm run dev
# Servidor en http://localhost:3000
# Usuarios seed: user@test.com / User1234!  ·  admin@test.com / Admin1234!
```

## 5. Flujo de prueba (Thunder Client / Postman)

1. **Health + Helmet** → `GET /api/v1/health`. Verifica cabeceras: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `RateLimit-Limit: 100`.
2. **Catálogo público** → `GET /api/v1/modelos` sin token. Esperado: `200`.
3. **Login user** → `POST /api/v1/auth/login` con `{ "email": "user@test.com", "password": "User1234!" }`. Guarda el `accessToken` y la cookie `refreshToken`.
4. **Crear ficha** → `POST /api/v1/modelos` con `Authorization: Bearer <token>`:
   ```json
   {
     "fullName": "Valentina Ríos",
     "code": "MDL-0001",
     "gender": "femenino",
     "birthDate": "2002-05-14",
     "height": 178,
     "category": "pasarela",
     "experienceYears": 3,
     "dailyRate": 850000,
     "portfolioUrl": "https://book.agencia.com/valentina-rios",
     "status": "disponible"
   }
   ```
   Esperado: `201`. Sin token: `401`.
5. **Editar propia ficha** → `PATCH /api/v1/modelos/:id` con `{ "status": "en-contrato" }`. Esperado: `200`.
6. **Editar ficha ajena (user)** → login con otro `user`, intenta el PATCH. Esperado: `403`.
7. **Eliminar como user** → `DELETE /api/v1/modelos/:id`. Esperado: `403`.
8. **Login admin + eliminar** → login `admin@test.com / Admin1234!`, repite DELETE. Esperado: `200`.
9. **Rate limit auth** → 6 logins seguidos. El 6.º: `429 Too Many Requests`.
10. **NoSQL injection** → `POST /api/v1/auth/login` con `{ "email": { "$gt": "" }, "password": { "$gt": "" } }`. Esperado: `401` (sanitizado, sin bypass).
11. **XSS** → crear ficha con `"fullName": "<script>alert(1)</script>"`. Esperado: `400 Validation failed`.

## 6. Estructura del proyecto

```
src/
├── app.ts                    # Helmet → rate limit → CORS → parsers → sanitize → rutas
├── server.ts                 # connectDB + seed (user/admin) + listen
├── config/security.ts        # globalLimiter, authLimiter, corsOptions (whitelist)
├── lib/mongoose.ts
├── errors/AppError.ts
├── types/express.d.ts        # req.user tipado
├── utils/jwt.ts              # access (15m, Bearer) + refresh (7d, cookie)
├── middlewares/
│   ├── auth.middleware.ts    # Bearer → req.user (401)
│   ├── requireRole.ts        # roles → 403 (siempre después de auth)
│   ├── errorHandler.ts       # AppError + Zod + Mongoose + 500 genérico
│   └── notFound.ts
├── schemas/
│   ├── auth.schema.ts
│   └── modelo.schema.ts      # Validación + anti-XSS
├── models/
│   ├── user.model.ts         # role user/admin
│   └── modelo.model.ts       # Ficha del/de la modelo
├── repositories/users.repository.ts
├── services/
│   ├── auth.service.ts
│   └── modelo.service.ts     # Código único + dueño-o-admin (FORBIDDEN)
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   └── modelo.controller.ts  # FORBIDDEN → 403
└── routes/
    ├── auth.routes.ts        # authLimiter en register/login
    ├── user.routes.ts
    └── modelo.routes.ts      # público / auth / auth+admin
```
