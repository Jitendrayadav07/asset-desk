require("dotenv").config();

const express = require("express");
const cors = require("cors");
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

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(formData.parse());
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-env",
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

mountSwagger(app);

app.use("/api/auth", authRoutes);
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    isSuccess: false,
    result: null,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  });
});

app.use((err, req, res, next) => {
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

  console.error(err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    isSuccess: false,
    result: null,
    message: err.message || "Internal Server Error",
    statusCode: status,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API base:     http://localhost:${PORT}/api`);
  console.log(`API docs:     http://localhost:${PORT}/api-docs`);
});

module.exports = app;
