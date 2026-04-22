const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwtTokenKey");
const Response = require("../classes/Response");
const User = require("../models/User");

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
      { expiresIn: "24h" }
    );

    res.cookie("microsoftAuthToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const clientUrl = `${process.env.REDIRECT_URL}/auth/microsoft/success`;
    const redirectUrl = 'http://localhost:8080/dashboard';
    return res.redirect(redirectUrl);
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

    res.clearCookie("microsoftAuthToken");

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
