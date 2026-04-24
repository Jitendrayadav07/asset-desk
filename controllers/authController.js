const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwtTokenKey");
const Response = require("../classes/Response");
const db = require("../config/db.config");
const { LOGIN_TYPE } = require("../constants/userConstants");
const { getAuthCookieOptions } = require("../config/cookies");
const { recordActivity } = require("./activityController");

function resolveFrontendSuccessUrl() {
  const explicit = process.env.FRONTEND_POST_LOGIN_REDIRECT;
  if (explicit) return explicit;
  const origin = process.env.CLIENT_ORIGIN;
  if (origin) return `${origin.replace(/\/$/, "")}/auth/microsoft/success`;
  return "/auth/microsoft/success";
}

function toPlain(user) {
  return user && typeof user.get === "function"
    ? user.get({ plain: true })
    : user;
}

function publicUser(user) {
  const u = toPlain(user);
  return {
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    given_name: u.given_name,
    family_name: u.family_name,
    microsoft_id: u.microsoft_id,
    login_type: u.login_type,
    is_active: u.is_active,
    last_login: u.last_login,
    role: u.role,
    created_at: u.created_at,
  };
}

async function upsertFromMicrosoftProfile(profile) {
  const email =
    (profile.emails && profile.emails[0] && profile.emails[0].value) ||
    (profile._json && (profile._json.mail || profile._json.userPrincipalName)) ||
    null;

  if (!email) {
    throw new Error("Microsoft profile did not return an email");
  }

  const microsoftId = profile.id || null;
  const displayName = profile.displayName || null;
  const givenName = (profile.name && profile.name.givenName) || null;
  const familyName = (profile.name && profile.name.familyName) || null;

  const existing = await db.user.findOne({ where: { email } });
  if (!existing) {
    return db.user.create({
      email,
      display_name: displayName,
      given_name: givenName,
      family_name: familyName,
      microsoft_id: microsoftId,
      login_type: LOGIN_TYPE.MICROSOFT,
      last_login: new Date(),
    });
  }

  await existing.update({
    display_name: displayName != null ? displayName : existing.display_name,
    given_name: givenName != null ? givenName : existing.given_name,
    family_name: familyName != null ? familyName : existing.family_name,
    microsoft_id: microsoftId != null ? microsoftId : existing.microsoft_id,
    login_type: LOGIN_TYPE.MICROSOFT,
    last_login: new Date(),
  });
  return existing.reload();
}

const microsoftCallback = async (req, res) => {
  try {
    const profile = req.user;

    const user = await upsertFromMicrosoftProfile(profile);

    if (!user.is_active) {
      return res
        .status(403)
        .json(Response.sendResponse(false, null, "User is deactivated", 403));
    }

    const token = jwt.sign(
      { user_id: user.id, email_id: user.email, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    await db.user.update({ last_login: new Date() }, { where: { id: user.id } });

    res.cookie("microsoftAuthToken", token, {
      ...getAuthCookieOptions(),
      maxAge: 24 * 60 * 60 * 1000,
    });

    const fragment = Buffer.from(
      JSON.stringify({ token, user: publicUser(user) }),
      "utf8"
    ).toString("base64url");

    return res.redirect(`${resolveFrontendSuccessUrl()}#auth=${fragment}`);
  } catch (err) {
    console.error("Error during Microsoft callback:", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, err.message || "Internal Server Error", 500));
  }
};

const microsoftLoginSuccess = async (req, res) => {
  try {
    const { email_id: emailId } = req.user || {};
    console.log("emailId", emailId);
    if (!emailId) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, "Invalid session — no email in token", 400));
    }

    const user = await db.user.findOne({ where: { email: emailId } });
    if (!user) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, "User not found", 404));
    }

    const u = toPlain(user);

    if (!u.is_active) {
      return res
        .status(403)
        .json(Response.sendResponse(false, null, "User is deactivated", 403));
    }

    res.clearCookie("microsoftAuthToken", getAuthCookieOptions());

    const token = jwt.sign(
      { user_id: u.id, email_id: u.email, role: u.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    await db.user.update({ last_login: new Date() }, { where: { id: u.id } });

    // `req.user` here is the raw passport-JWT claim `{ email_id }` with no
    // user_id or role, so we pass an explicit actor pulled from the loaded DB row.
    recordActivity(req, {
      action: "auth.login",
      entity_type: "auth",
      entity_id: u.id,
      entity_label: u.display_name ? `${u.display_name} (${u.email})` : u.email,
      metadata: { login_type: u.login_type },
      actor: { user_id: u.id, email_id: u.email, role: u.role },
    });

    return res
      .status(200)
      .json(Response.sendResponse(true, { ...u, token }, "Login successful", 200));
  } catch (err) {
    console.error("Error in microsoftLoginSuccess:", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, err.message || "Internal Server Error", 500));
  }
};

module.exports = {
  microsoftCallback,
  microsoftLoginSuccess,
};
