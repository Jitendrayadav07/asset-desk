# NODESKILL.md — Project Standards & Development Guide

## Project Overview

Node.js REST API built with **Express 5**, **Supabase** (Postgres) via `@supabase/supabase-js` + `pg` pool, and **Swagger/OpenAPI** documentation. The API is mounted at `/api` and documented at `/api-docs`.

## Tech Stack

- **Runtime:** Node.js with CommonJS (`require`/`module.exports`)
- **Framework:** Express 5
- **Database:** Supabase (managed Postgres)
  - `@supabase/supabase-js` — REST/auth/realtime/storage client (uses service-role key on the server)
  - `pg` — direct Postgres pool for raw SQL (connection string from Supabase → Settings → Database)
- **Validation:** Joi
- **Auth:** JWT (`jsonwebtoken`) + bcrypt for password hashing
- **Docs:** swagger-jsdoc + swagger-ui-express (OpenAPI 3.0.3)
- **Form parsing:** express-form-data
- **Dev:** nodemon (`npm run dev`)

## Project Structure

```
index.js                  # App entry point, Express setup, middleware, Swagger mount
config/
  supabase.js             # supabase-js clients (admin + public) - singletons
  db.js                   # pg Pool singleton + query() helper
  swagger.js              # Swagger/OpenAPI spec + mountSwagger()
  jwtTokenKey.js          # JWT secret + expiresIn from .env
classes/
  Response.js             # Standardized API response envelope class
constants/
  *Constants.js           # Domain-specific constant objects (e.g., skillControllerConstants.js)
controllers/
  *Controller.js          # Route handlers - PascalCase filenames (e.g., SkillController.js)
services/
  *Service.js             # Business logic - camelCase filenames (e.g., skillService.js)
models/
  *.js                    # Supabase table accessors - PascalCase (e.g., Skill.js)
routes/
  index.js                # Central router - aggregates all domain route files, exposes /health
  *Routes.js              # Domain route files (e.g., skillRoutes.js)
middlewares/
  joi/joiMiddleware.js    # Generic Joi validation middleware (body/query/params)
  jsonwebtoken/           # JWT auth middleware
validations/
  *Validations.js         # Joi schema definitions per domain (e.g., skillValidations.js)
scripts/
  checkConnection.js      # Pings supabase-js AND pg pool; run via `npm run db:check`
  runMigrations.js        # Applies .sql files from scripts/migrations/, tracks in _migrations
  migrations/             # Plain SQL migrations (NNN_description.sql)
  seeds/                  # Seed scripts (e.g., seedSkills.js)
templates/                # Email/notification templates (future use)
utils/                    # Utility/helper functions (future use)
public/                   # Static assets
```

## Architecture & Request Flow

```
Route (+ Swagger docs) -> Middleware (Joi / JWT) -> Controller -> Service -> Model -> Supabase (pg / supabase-js)
```

1. **Routes** define endpoints with Swagger JSDoc annotations and wire middleware + controller
2. **Middleware** handles cross-cutting concerns (validation, auth) before controllers
3. **Controllers** extract request data, call services, and return standardized responses
4. **Services** contain all business logic and DB operations (calls Model methods, never raw DB in controllers)
5. **Models** are Supabase table accessors — thin wrappers around `pg` queries, with an escape hatch to `supabase-js` for realtime/storage

## Coding Standards

### Response Format

ALL API responses MUST use the `Response.sendResponse()` envelope:

```js
const Response = require("../classes/Response");

// Success
return res.status(201).json(Response.sendResponse(true, data, "Success message", 201));

// Error
return res.status(status).json(Response.sendResponse(false, null, error.message, status));
```

Envelope shape: `{ isSuccess, result, message, statusCode }`

### Controller Pattern

- Export an object of named async functions
- Always use try/catch
- Extract request params at the top of the function
- Delegate ALL business logic to the service layer
- Controllers must NOT contain database queries or business rules

```js
const controllerMethod = async (req, res) => {
  try {
    const { field1, field2 } = req.body;
    const result = await someService.doSomething({ field1, field2 });
    return res.status(200).json(Response.sendResponse(true, result, "Done", 200));
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json(Response.sendResponse(false, null, error.message, status));
  }
};

module.exports = { controllerMethod };
```

### Service Pattern

- Export named functions (not a class)
- Throw errors with `statusCode` property for HTTP-level errors
- Handle all DB queries (via Model) and business logic here

```js
function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function doSomething({ field1, field2 }) {
  // business logic + Model calls
}

module.exports = { doSomething };
```

### Model Pattern (Supabase)

Models are thin data-access objects — NOT ORM classes. Each model exports an object of async functions that run parameterized SQL through the `pg` pool, with an optional `_supabase()` helper for cases that need `supabase-js` (realtime subscriptions, RLS-bound queries, storage, etc.).

- Use parameterized queries (`$1, $2, ...`) — never string-concat user input
- Table names are `snake_case` plurals (e.g., `skills`, `users`)
- Expose CRUD primitives: `findAll`, `findById`, `findBy<Field>`, `create`, `update`, `remove`
- Return plain row objects from `pg`; callers decide how to shape responses

```js
const { supabaseAdmin } = require("../config/supabase");
const { query } = require("../config/db");

const TABLE = "skills";

const Skill = {
  tableName: TABLE,

  async findById(id) {
    const { rows } = await query(`SELECT * FROM ${TABLE} WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async create({ name, description, level }) {
    const { rows } = await query(
      `INSERT INTO ${TABLE} (name, description, level) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, level]
    );
    return rows[0];
  },

  // Escape hatch for realtime / storage / RLS
  _supabase: () => supabaseAdmin.from(TABLE),
};

module.exports = Skill;
```

### Validation Pattern

- Define Joi schemas in `validations/<domain>Validations.js`
- Export named schema objects
- Include custom `.messages()` for user-friendly error text
- Apply via `JoiMiddleWare(schema, "body"|"query"|"params")` in routes

### Route Pattern

- One file per domain in `routes/` (e.g., `skillRoutes.js`)
- Register in `routes/index.js` under a resource prefix: `router.use("/resource", resourceRoutes)`
- Add Swagger JSDoc annotations (`@openapi`) above each route definition
- Middleware chain order: validation first, then auth, then controller

```js
router.post("/endpoint", JoiMiddleWare(schema, "body"), controller.method);
router.get("/protected", jwtMiddleware, controller.method);
```

### Swagger / API Documentation

- Every route MUST have `@openapi` JSDoc annotations
- Reusable schemas go in `config/swagger.js` under `components.schemas`
- Tags should match the domain name (e.g., `Skill`, `User`)
- Response schemas should reference the `ApiEnvelope` wrapper

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files - Controllers | PascalCase | `SkillController.js` |
| Files - Services | camelCase | `skillService.js` |
| Files - Models | PascalCase | `Skill.js` |
| Files - Routes | camelCase | `skillRoutes.js` |
| Files - Validations | camelCase | `skillValidations.js` |
| Files - Constants | camelCase | `skillControllerConstants.js` |
| DB tables | snake_case plural | `skills`, `users` |
| DB columns | snake_case | `created_at`, `updated_at` |
| JS variables/functions | camelCase | `createSkill`, `listSkills` |
| Model names | PascalCase | `Skill`, `User` |
| Constants keys | UPPER_SNAKE_CASE | `SKILL_CREATED` |
| Route prefixes | lowercase singular | `/skill`, `/user` |

## Database & Migrations (Supabase)

- Provider: **Supabase** (managed Postgres). All DB access goes through one of two clients:
  - `config/supabase.js` → `supabase-js` clients (`supabaseAdmin`, `supabasePublic`). Use for auth, storage, realtime, or when RLS should apply.
  - `config/db.js` → `pg` Pool + `query(text, params)` helper. Use for server-side SQL where the service-role bypasses RLS.
- Connection strings come from the Supabase dashboard:
  - REST/Auth: **Project Settings → API** → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Postgres: **Project Settings → Database → Connection string → URI** → `DATABASE_URL`
    - Use the **Session** pooler (port 5432) for long-lived Node processes
    - Use the **Transaction** pooler (port 6543) for serverless / short-lived functions
- Migrations are **plain SQL files** in `scripts/migrations/` with names like `001_create_skills.sql`, `002_add_user_role.sql` (zero-padded ordinal + description).
- The runner (`scripts/runMigrations.js`) tracks applied migrations in a `_migrations` table and wraps each file in a transaction.
- There is NO `sequelize.sync()` equivalent — schema is explicit, managed by migrations.

### Commands

```bash
npm run dev              # Start with nodemon (hot reload)
npm start                # Start in production mode
npm run db:check         # Ping both supabase-js and pg pool (use after filling .env)
npm run db:migrate       # Apply pending .sql migrations in scripts/migrations/
npm run seed:skills      # Seed sample skills
```

## Environment Variables

Copy `.env.example` → `.env` and fill in:

| Var | Source | Purpose |
|-----|--------|---------|
| `PORT` | — | HTTP port (default `6000`) |
| `NODE_ENV` | — | `development` \| `production` |
| `SUPABASE_URL` | Supabase → Settings → API | Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | Public/anon key (safe for browser use) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Server-only** — bypasses RLS |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → URI | Postgres URL for `pg` pool |
| `JWT_SECRET` | — | JWT signing secret (use a long random string) |
| `JWT_EXPIRES_IN` | — | Token lifetime (e.g. `7d`) |

**Never commit `.env`** — it's in `.gitignore`. `SUPABASE_SERVICE_ROLE_KEY` must never ship to the browser.

## Adding a New Feature Checklist

When adding a new domain/resource (e.g., "Product"):

1. **Migration** — Add `scripts/migrations/NNN_create_products.sql` with `CREATE TABLE` + the standard `set_updated_at` trigger
2. **Model** — Create `models/Product.js` with CRUD functions using `query()` from `config/db.js`
3. **Validation** — Create `validations/productValidations.js` with Joi schemas
4. **Service** — Create `services/productService.js` with business logic (throws `httpError`)
5. **Controller** — Create `controllers/ProductController.js` with route handlers
6. **Routes** — Create `routes/productRoutes.js` with Swagger `@openapi` annotations
7. **Register Route** — Add `router.use("/product", productRoutes)` in `routes/index.js`
8. **Constants** (if needed) — Create `constants/productControllerConstants.js`
9. **Run migration** — `npm run db:migrate`

## Database Connection Verification

After filling in `.env`, verify connectivity BEFORE running the app:

```bash
npm run db:check
```

Expected output:

```
== Supabase REST (supabase-js) ==
✓ supabase-js connected

== Postgres (pg pool) ==
✓ pg pool connected
  server time: 2026-04-20T...
  database: postgres
```

If either check fails, fix `.env` before running migrations.

## Important Notes

- All API routes are prefixed with `/api` (set in `index.js`)
- CORS is open (`origin: "*"`) — tighten for production
- JWT secret is read from `process.env.JWT_SECRET` (set it to a long random string)
- Password hashing uses bcrypt with salt rounds = 10
- Sensitive fields (e.g., `password`) must be excluded from API responses
- JSON body limit is set to 50mb
- Static files served from `public/` directory
- The `pg` pool bypasses Supabase RLS because it authenticates as the Postgres superuser via `DATABASE_URL`. If you need RLS-aware access, use `supabasePublic` with a user JWT instead.
