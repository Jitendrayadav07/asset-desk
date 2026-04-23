const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwtTokenKey");
const Response = require("../classes/Response");
const User = require("../models/User");
const { getAuthCookieOptions } = require("../config/cookies");

function resolveFrontendSuccessUrl() {
  const explicit = process.env.FRONTEND_POST_LOGIN_REDIRECT;
  if (explicit) return explicit;
  const origin = process.env.CLIENT_ORIGIN;
  if (origin) return `${origin.replace(/\/$/, "")}/auth/microsoft/success`;
  return "/auth/microsoft/success";
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    given_name: user.given_name,
    family_name: user.family_name,
    microsoft_id: user.microsoft_id,
    login_type: user.login_type,
    is_active: user.is_active,
    last_login: user.last_login,
    created_at: user.created_at,
  };
}

const microsoftCallback = async (req, res) => {
  try {
    const profile = req.user;

    const user = await User.upsertFromMicrosoftProfile(profile);

    if (!user.is_active) {
      return res
        .status(403)
        .json(Response.sendResponse(false, null, "User is deactivated", 403));
    }

    const token = jwt.sign(
      { user_id: user.id, email_id: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    await User.touchLastLogin(user.id);

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

    const user = await User.findByEmail(emailId);
    if (!user) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, "User not found", 404));
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json(Response.sendResponse(false, null, "User is deactivated", 403));
    }

    res.clearCookie("microsoftAuthToken", getAuthCookieOptions());

    const token = jwt.sign(
      { user_id: user.id, email_id: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    await User.touchLastLogin(user.id);

    return res
      .status(200)
      .json(Response.sendResponse(true, { ...user, token }, "Login successful", 200));
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
