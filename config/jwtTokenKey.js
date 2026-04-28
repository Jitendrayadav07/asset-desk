const isProd = process.env.NODE_ENV === "production";

const secret = process.env.JWT_SECRET;
if (!secret || secret === "change-me-in-env" || secret.length < 32) {
  if (isProd) {
    throw new Error(
      "JWT_SECRET is missing, weak, or default. Set a 32+ char random string before starting in production.",
    );
  }
  // Surface a loud warning in non-prod so devs notice. Don't crash dev loops.
  console.warn(
    "[security] JWT_SECRET is missing or weak — using a dev fallback. Do NOT deploy without setting JWT_SECRET.",
  );
}

const jwtConfig = {
  secret: secret || "dev-only-insecure-fallback-do-not-deploy",
  // Default to 24h instead of 7d. Short-lived tokens limit blast radius if
  // a token leaks. Override per-deployment via JWT_EXPIRES_IN.
  expiresIn: process.env.JWT_EXPIRES_IN || "24h",
};

module.exports = jwtConfig;
