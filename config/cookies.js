function isCrossSite() {
  const override = process.env.COOKIE_SAMESITE;
  if (override) return override.toLowerCase() === "none";

  const clientOrigin = process.env.CLIENT_ORIGIN;
  const backendOrigin = process.env.REDIRECT_URL;
  try {
    if (clientOrigin && backendOrigin) {
      return new URL(clientOrigin).origin !== new URL(backendOrigin).origin;
    }
  } catch {
    /* fall through */
  }
  return process.env.NODE_ENV === "production";
}

function getAuthCookieOptions() {
  const crossSite = isCrossSite();
  const secureOverride = process.env.COOKIE_SECURE;
  const secure =
    secureOverride != null
      ? secureOverride === "true"
      : crossSite || process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure,
    path: "/",
  };
}

module.exports = { getAuthCookieOptions, isCrossSite };
