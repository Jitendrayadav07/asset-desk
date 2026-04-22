const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AssetDesk Backend API",
      version: "1.0.0",
      description: "REST API for AssetDesk — Express 5 + Supabase",
    },
    servers: [
      { url: "/api", description: "API base" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiEnvelope: {
          type: "object",
          properties: {
            isSuccess: { type: "boolean" },
            result: { nullable: true },
            message: { type: "string" },
            statusCode: { type: "integer" },
          },
          required: ["isSuccess", "message", "statusCode"],
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

function mountSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "AssetDesk API Docs",
  }));

  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

module.exports = { swaggerSpec, mountSwagger };
