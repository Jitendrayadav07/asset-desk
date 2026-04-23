const ASSET_CONSTANTS = {
  CREATED: "Asset created",
  UPDATED: "Asset updated",
  DELETED: "Asset deleted",
  RETIRED: "Asset marked as end-of-life",
  MISSING_REPORTED: "Asset reported as missing",
  RESTORED: "Asset restored to active",
  ALREADY_RETIRED: "Asset is already end-of-life",
  ALREADY_MISSING: "Asset is already reported missing",
  NOT_RETIRED_OR_MISSING: "Asset is not retired or missing",
  STATUS_LOOKUP_MISSING:
    "Required asset_status lookup row is missing. Seed asset_statuses first.",
  INVALID_TYPE_ID: "Invalid asset_type_id",
  INVALID_STATUS_ID: "Invalid asset_status_id",
  INVALID_CONDITION_ID: "Invalid asset_condition_id",
  SERIAL_EXISTS: "Serial number already exists",
  NOT_FOUND: "Asset not found",
  ERROR_OCCURED: "An error occurred! Please try again",
};

module.exports = ASSET_CONSTANTS;
