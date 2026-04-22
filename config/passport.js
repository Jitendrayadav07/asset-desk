const passport = require("passport");
const MicrosoftStrategy = require("passport-microsoft").Strategy;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const REDIRECT_URL = process.env.REDIRECT_URL;

if (MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET && REDIRECT_URL) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: MICROSOFT_CLIENT_ID,
        clientSecret: MICROSOFT_CLIENT_SECRET,
        callbackURL: `${REDIRECT_URL}/api/auth/microsoft/callback`,
        tenant: MICROSOFT_TENANT_ID,
        scope: ["openid", "profile", "user.read"],
      },
      function (accessToken, refreshToken, profile, done) {
        done(null, profile);
      }
    )
  );
} else {
  console.warn(
    "[passport] Microsoft strategy not initialized — set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and REDIRECT_URL in .env"
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
