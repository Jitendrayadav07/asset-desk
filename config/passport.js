const passport = require("passport");
const MicrosoftStrategy = require("passport-microsoft").Strategy;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const REDIRECT_URL = process.env.REDIRECT_URL;

if (MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET && REDIRECT_URL) {
  const microsoftStrategy = new MicrosoftStrategy(
    {
      clientID: MICROSOFT_CLIENT_ID,
      clientSecret: MICROSOFT_CLIENT_SECRET,
      callbackURL: `${REDIRECT_URL}/api/auth/microsoft/callback`,
      tenant: MICROSOFT_TENANT_ID,
      scope: ["openid", "profile", "user.read"],
      // NOTE: `state: true` would enable OAuth state CSRF protection, but
      // it's incompatible with the current `saveUninitialized: false`
      // session config — the state token isn't persisted to the session
      // cookie before the redirect to Microsoft, causing every callback
      // to fail. Re-enabling requires switching to a persistent session
      // store (Redis / connect-pg-simple) and verifying the cookie round-
      // trip end-to-end. Tracked for PR #3.
    },
    function (accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  );

  // Always add `prompt=select_account` to the authorize URL so Microsoft
  // shows the account picker even if the browser already has an active
  // Microsoft session. Without this, "sign out" in our app clears our JWT
  // but Microsoft's cookie silently re-returns the same user on the next
  // "Continue with Microsoft" click, so users can never switch accounts.
  const originalAuthParams = microsoftStrategy.authorizationParams
    ? microsoftStrategy.authorizationParams.bind(microsoftStrategy)
    : () => ({});
  microsoftStrategy.authorizationParams = function (options) {
    return {
      ...originalAuthParams(options),
      prompt: (options && options.prompt) || "select_account",
    };
  };

  passport.use(microsoftStrategy);
} else {
  console.warn(
    "[passport] Microsoft strategy not initialized — set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and REDIRECT_URL in .env"
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
