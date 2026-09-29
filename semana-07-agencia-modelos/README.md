# Proyecto Semana 07 — Agencia de Modelos · Autenticación JWT Completa

API REST con sistema de autenticación completo (**bcrypt** + **JWT access/refresh tokens** en **cookies HttpOnly**) y CRUD protegido del recurso principal del dominio: **fichas de modelos** de la agencia.

## 1. Dominio: Agencia de Modelos

La agencia representa modelos profesionales y gestiona su portafolio. Cada ficha (`Modelo`) contiene la información que un booker necesita para ofrecer talento a clientes (marcas, revistas, productoras).

### Recurso principal: `Modelo`

| Campo | Tipo | Descripción |
|---|---|---|
| `fullName` | string | Nombre completo del/de la modelo |
| `code` | string (único) | Código de agencia, formato `AAA-0000` (ej: `MDL-0001`) |
| `gender` | enum | `femenino` · `masculino` · `no-binario` |
| `birthDate` | fecha ISO | Fecha de nacimiento (edad mínima: 14 años) |
| `height` | number | Estatura en cm (140–220) |
| `category` | enum | `pasarela` · `publicidad` · `editorial` · `fitness` · `plus-size` · `infantil` · `partes` |
| `experienceYears` | number | Años de experiencia (0–60) |
| `dailyRate` | number | Tarifa por día de trabajo (> 0) |
| `portfolioUrl` | string? | URL del book/portafolio |
| `phone` | string? | Teléfono de contacto |
| `status` | enum | `disponible` · `en-contrato` · `inactivo` |
| `active` | boolean | Ficha activa o archivada |
| `createdBy` | ObjectId | Usuario que registró la ficha |

### Reglas de negocio

- El `code` es único y no se puede modificar (identificador estable de la agencia).
- Edad mínima de 14 años al registrar o actualizar `birthDate`.
- Filtros de listado: `GET /api/v1/modelos?category=pasarela&status=disponible`.

## 2. Endpoints

### Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Público | Registro (hash bcrypt, salt rounds 10) |
| POST | `/api/v1/auth/login` | Público | Login, emite access + refresh en cookies HttpOnly |
| GET | `/api/v1/auth/me` | Autenticado | Perfil del usuario actual |
| POST | `/api/v1/auth/refresh` | Refresh cookie | Rota access + refresh tokens |
| POST | `/api/v1/auth/logout` | Autenticado | Invalida refresh en DB y limpia cookies |

### Fichas de modelos (todas protegidas con `authMiddleware`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/modelos` | Listar fichas (filtros: `category`, `status`) |
| GET | `/api/v1/modelos/:id` | Obtener una ficha (404 si no existe) |
| POST | `/api/v1/modelos` | Crear ficha (valida con Zod, 201) |
| PATCH | `/api/v1/modelos/:id` | Actualización parcial |
| DELETE | `/api/v1/modelos/:id` | Eliminar ficha (204) |

## 3. Seguridad implementada

| Criterio | Implementación |
|---|---|
| Contraseñas hasheadas | `bcrypt.hash()` con salt rounds 10 |
| Secretos distintos | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET` (en `.env`) |
| Tokens en cookies HttpOnly | `httpOnly: true`, `sameSite: lax`, `secure` en producción |
| Refresh hasheado en DB | Solo se almacena el hash SHA-256, nunca el token en claro (comparación con `timingSafeEqual`) |
| Rotación de refresh | Cada `/refresh` invalida el anterior |
| Rutas protegidas | Todo `/modelos` usa `authMiddleware` |
| Anti user-enumeration | Mismo mensaje `Credenciales inválidas` para email/pass incorrectos |
| Validación | Zod en entrada + validaciones de Mongoose + manejo de clave duplicada (409) |

> **Nota de diseño:** las contraseñas usan `bcrypt` (salt rounds 10), pero los refresh tokens se hashean con **SHA-256**. bcrypt trunca la entrada a 72 bytes y dos refresh JWT del mismo usuario solo difieren después del byte ~86 (comparten header + `sub`), por lo que bcrypt los consideraría iguales y rompería la rotación. SHA-256 distingue cualquier diferencia y es el estándar para hashear tokens de alta entropía.

## 4. Cómo ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Generar secretos:
#   openssl rand -base64 64   (x2, uno para cada JWT_*_SECRET)

# 3. Levantar MongoDB
docker compose up -d

# 4. Iniciar servidor
npm run dev
# Servidor en http://localhost:3000
```

## 5. Flujo de prueba (Thunder Client / Postman)

> Activa el manejo de cookies en tu cliente para que `accessToken` y `refreshToken` se envíen automáticamente.

1. **Register** → `POST /api/v1/auth/register`
   ```json
   { "name": "Booker Admin", "email": "booker@agencia.com", "password": "Agencia123" }
   ```
   Esperado: `201` con `{ id, email, name, role }`.
2. **Login** → `POST /api/v1/auth/login` con el mismo body. Esperado: `200` + cookies `accessToken` (15 min) y `refreshToken` (7 días, path `/api/v1/auth`).
3. **Me** → `GET /api/v1/auth/me`. Esperado: `200` con el perfil.
4. **Crear ficha** → `POST /api/v1/modelos`
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
     "phone": "+573001234567",
     "status": "disponible"
   }
   ```
   Esperado: `201` con la ficha creada.
5. **Listar** → `GET /api/v1/modelos?status=disponible`. Esperado: `200` con `{ data, total }`.
6. **Detalle** → `GET /api/v1/modelos/:id`. Esperado: `200`. Con ID inexistente: `404`.
7. **Actualizar** → `PATCH /api/v1/modelos/:id` con `{ "status": "en-contrato" }`. Esperado: `200`.
8. **Sin token** → borra las cookies y repite el paso 5. Esperado: `401`.
9. **Refresh** → `POST /api/v1/auth/refresh` (con cookie `refreshToken`). Esperado: `200` + nuevas cookies.
10. **Logout** → `POST /api/v1/auth/logout`, luego repite **Refresh**. Esperado: `401` (token rotado/invalidado).

## 6. Estructura del proyecto

```
src/
├── app.ts                    # Monta /auth + /modelos
├── server.ts                 # connectDB + listen
├── lib/mongoose.ts           # Conexión a MongoDB
├── errors/AppError.ts        # Error operacional con statusCode
├── types/express.d.ts        # req.user tipado (JwtPayload)
├── utils/jwt.ts              # sign/verify access (15m) + refresh (7d)
├── middlewares/
│   ├── auth.middleware.ts    # Verifica JWT de cookie → req.user
│   ├── errorHandler.ts       # AppError + Zod + Mongoose + duplicados
│   └── notFound.ts           # 404
├── schemas/
│   ├── auth.schema.ts        # register/login (Zod)
│   └── modelo.schema.ts      # create/update de ficha (Zod)
├── models/
│   ├── user.model.ts         # email, password(select:false), role, refreshToken
│   └── modelo.model.ts       # Ficha del/de la modelo
├── repositories/
│   ├── users.repository.ts
│   └── modelo.repository.ts
├── services/
│   ├── auth.service.ts       # register/login/refresh/logout/getMe
│   └── modelo.service.ts     # Reglas: código único, edad mínima
├── controllers/
│   ├── auth.controller.ts    # Setea/limpia cookies HttpOnly
│   └── modelo.controller.ts  # CRUD HTTP
└── routes/
    ├── auth.routes.ts
    └── modelo.routes.ts      # CRUD protegido con authMiddleware
```
