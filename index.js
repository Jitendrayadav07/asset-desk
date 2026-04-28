require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const formData = require("express-form-data");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("./config/passport");
const { getAuthCookieOptions } = require("./config/cookies");

const routes = require("./routes");
const authRoutes = require("./routes/authRoutes");
const { mountSwagger } = require("./config/swagger");
const Response = require("./classes/Response");

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === "production";

// Don't advertise the framework. Combined with helmet, drops X-Powered-By,
// Server hints, etc. that fingerprinters key off of.
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security headers. CSP intentionally omitted at the API tier — the SPA
// serves its own. We do force noindex everywhere so search engines never
// index error pages, swagger, or the OAuth landing.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
  })
);
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  next();
});

// CORS allowlist. CLIENT_ORIGIN may be a comma-separated list. In prod we
// fail closed: requests with an Origin not on the list are rejected.
const allowedOrigins = String(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin / curl / server-to-server requests carry no Origin header.
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) {
        // No allowlist configured — only permit in dev to avoid surprising prod.
        return cb(null, !isProd);
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
// JSON / urlencoded bodies are normal API traffic — keep tight to limit DoS
// surface. Multipart Excel uploads bypass these limits and are bounded
// separately inside readUploadedExcelBuffer (5MB hard cap).
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(formData.parse());
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());

// Rate limit auth endpoints harder than general API to slow brute-force /
// OAuth replay attempts. Both limiters key on IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { isSuccess: false, result: null, message: "Too many attempts. Try again later.", statusCode: 429 },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { isSuccess: false, result: null, message: "Too many requests. Slow down.", statusCode: 429 },
});

// Fail loudly if SESSION_SECRET is weak in prod. Session secret signs the
// connect.sid cookie used during the OAuth handshake — a guessable value
// lets an attacker forge sessions.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === "change-me-in-env" || sessionSecret.length < 32) {
  if (isProd) {
    throw new Error(
      "SESSION_SECRET is missing, weak, or default. Set a 32+ char random string before starting in production.",
    );
  }
  console.warn(
    "[security] SESSION_SECRET is missing or weak — using a dev fallback. Do NOT deploy without setting SESSION_SECRET.",
  );
}
app.use(
  session({
    secret: sessionSecret || "dev-only-insecure-fallback-do-not-deploy",
    resave: false,
    saveUninitialized: false,
    cookie: getAuthCookieOptions(),
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, "public")));

app.get("/auth/microsoft/success", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "auth-success.html"));
});

// Swagger documents every endpoint and request shape — that's exactly
// what we don't want to ship to attackers. Mount it only when explicitly
// opted in (e.g. EXPOSE_SWAGGER=1 in dev/staging).
if (!isProd || process.env.EXPOSE_SWAGGER === "1") {
  mountSwagger(app);
}

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter, routes);

app.use((req, res) => {
  // Don't echo the path back — gives attackers free recon confirmation.
  res.status(404).json({
    isSuccess: false,
    result: null,
    message: "Not Found",
    statusCode: 404,
  });
});

app.use((err, _req, res, _next) => {
  const isBadJsonBody =
    err?.type === "entity.parse.failed" ||
    (((err instanceof SyntaxError || err.name === "SyntaxError") &&
      (err.status === 400 || err.statusCode === 400)) &&
      String(err.message || "").toLowerCase().includes("json"));

  if (isBadJsonBody) {
    const hint =
      "Fix the JSON syntax in the request body. Values that contain a straight double quote character must escape it as backslash-quote. For example, for 14 inches send name_model as \"MacBook Pro 14\\\"\" not \"MacBook Pro 14\"\".";
    return res.status(400).json(
      Response.sendResponse(false, null, hint, 400)
    );
  }

  // Always log server-side; never leak stack traces or framework details
  // to clients in prod. Outbound message is either a controller-supplied
  // safe string (4xx) or a generic 5xx.
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const safeMessage =
    status >= 400 && status < 500 && err.message && !isProd
      ? err.message
      : status >= 400 && status < 500
        ? err.expose
          ? err.message
          : "Bad Request"
        : "Internal Server Error";
  res.status(status).json({
    isSuccess: false,
    result: null,
    message: safeMessage,
    statusCode: status,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API base:     http://localhost:${PORT}/api`);
  if (!isProd || process.env.EXPOSE_SWAGGER === "1") {
    console.log(`API docs:     http://localhost:${PORT}/api-docs`);
  }
});

module.exports = app;
