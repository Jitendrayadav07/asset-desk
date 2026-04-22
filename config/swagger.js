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
        AssetLookupRecord: {
          type: "object",
          description: "Row from asset_types, asset_conditions, or asset_statuses",
          properties: {
            id: { type: "integer", format: "int64", example: 1 },
            name: { type: "string", example: "Laptop" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        AssetLookupCreateBody: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Laptop" },
          },
        },
        AssetLookupUpdateBody: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "integer", format: "int64", minimum: 1, example: 1 },
            name: { type: "string", example: "Laptop" },
          },
        },
        AssetRecord: {
          type: "object",
          properties: {
            id: { type: "integer", format: "int64", example: 1 },
            serial_number: { type: "string", example: "SN-A100" },
            asset_type_id: { type: "integer", format: "int64", example: 1 },
            asset_status_id: { type: "integer", format: "int64", nullable: true },
            asset_condition_id: { type: "integer", format: "int64", nullable: true },
            name_model: { type: "string", example: "MacBook Pro 14 inch" },
            brand: { type: "string", example: "Apple" },
            model_number: { type: "string", nullable: true },
            configuration_specs: { type: "string", nullable: true },
            location: { type: "string", example: "Mumbai office" },
            purchase_date: { type: "string", format: "date", nullable: true, example: "2025-03-01" },
            price_usd: { type: "number", nullable: true, example: 1999.99 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            assetType: { $ref: "#/components/schemas/AssetLookupRecord" },
            assetStatus: {
              nullable: true,
              allOf: [{ $ref: "#/components/schemas/AssetLookupRecord" }],
            },
            assetCondition: {
              nullable: true,
              allOf: [{ $ref: "#/components/schemas/AssetLookupRecord" }],
            },
          },
        },
        AssetCreateBody: {
          type: "object",
          required: [
            "serial_number",
            "asset_type_id",
            "name_model",
            "brand",
            "location",
          ],
          properties: {
            serial_number: { type: "string", example: "SN-A100" },
            asset_type_id: { type: "integer", format: "int64", minimum: 1 },
            asset_status_id: { type: "integer", format: "int64", nullable: true },
            asset_condition_id: { type: "integer", format: "int64", nullable: true },
            name_model: {
              type: "string",
              description:
                'Encode quotes as \\" when needed (e.g. 14 inches: "MacBook Pro 14\\"" inside JSON).',
            },
            brand: { type: "string" },
            model_number: { type: "string", nullable: true },
            configuration_specs: { type: "string", nullable: true },
            location: { type: "string" },
            purchase_date: {
              type: "string",
              format: "date",
              nullable: true,
              description: "YYYY-MM-DD",
            },
            price_usd: { type: "number", minimum: 0, nullable: true },
          },
        },
        UserUpdateBody: {
          type: "object",
          required: ["id"],
          description:
            "Updatable profile fields only. Email / login_type / microsoft_id are managed by Microsoft auth.",
          properties: {
            id: { type: "integer", format: "int64", minimum: 1 },
            display_name: { type: "string", nullable: true },
            given_name: { type: "string", nullable: true },
            family_name: { type: "string", nullable: true },
            is_active: {
              type: "boolean",
              description: "Set false to deactivate login for this user.",
            },
          },
        },
        AssetUpdateBody: {
          type: "object",
          required: ["id"],
          description: "Include id plus any fields to update.",
          properties: {
            id: { type: "integer", format: "int64", minimum: 1 },
            serial_number: { type: "string" },
            asset_type_id: { type: "integer", format: "int64" },
            asset_status_id: { type: "integer", format: "int64", nullable: true },
            asset_condition_id: { type: "integer", format: "int64", nullable: true },
            name_model: { type: "string" },
            brand: { type: "string" },
            model_number: { type: "string", nullable: true },
            configuration_specs: { type: "string", nullable: true },
            location: { type: "string" },
            purchase_date: { type: "string", format: "date", nullable: true },
            price_usd: { type: "number", minimum: 0, nullable: true },
          },
        },
        EmployeeRecord: {
          type: "object",
          properties: {
            id: { type: "integer", format: "int64", example: 1 },
            name: { type: "string", example: "Jane Doe" },
            email: { type: "string", format: "email" },
            location: { type: "string", example: "Mumbai" },
            emp_id: { type: "string", description: "Unique employee code", example: "EMP-1024" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        EmployeeCreateBody: {
          type: "object",
          required: ["name", "email", "location", "emp_id"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            location: { type: "string" },
            emp_id: { type: "string", example: "EMP-1024" },
          },
        },
        EmployeeUpdateBody: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", format: "int64", minimum: 1 },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            location: { type: "string" },
            emp_id: { type: "string" },
          },
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
