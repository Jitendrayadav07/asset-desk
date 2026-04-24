const Response = require("../classes/Response");
const db = require("../config/db.config");
const EMPLOYEE_CONSTANTS = require("../constants/employeeConstants");
const { recordActivity } = require("./activityController");
const {
  readUploadedFileBuffer,
  parseWorkbookRows,
  buildTemplateBuffer,
  sendXlsxDownload,
  str,
} = require("./importHelpers");

function employeeLabel(emp) {
  if (!emp) return null;
  const name = emp.name || "";
  const empId = emp.emp_id || "";
  return empId && name ? `${empId} · ${name}` : name || empId || null;
}

function uniqueViolationMessage(err) {
  const detail = err.parent?.detail || err.original?.detail || "";
  const constraint = err.parent?.constraint || err.original?.constraint || "";
  const msg = `${detail} ${constraint}`.toLowerCase();
  if (msg.includes("email") || constraint.includes("email")) {
    return EMPLOYEE_CONSTANTS.DUPLICATE_EMAIL;
  }
  if (msg.includes("emp_id") || constraint.includes("emp")) {
    return EMPLOYEE_CONSTANTS.DUPLICATE_EMP_ID;
  }
  return EMPLOYEE_CONSTANTS.ERROR_OCCURED;
}

const createEmployee = async (req, res) => {
  try {
    const created = await db.employee.create(req.body);
    recordActivity(req, {
      action: "employee.create",
      entity_type: "employee",
      entity_id: created.id,
      entity_label: employeeLabel(created),
      metadata: { location: created.location ?? null },
    });
    return res
      .status(201)
      .json(Response.sendResponse(true, created, EMPLOYEE_CONSTANTS.CREATED, 201));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, uniqueViolationMessage(err), 400));
    }
    console.error("createEmployee", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const rows = await db.employee.findAll({
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json(Response.sendResponse(true, rows, null, 200));
  } catch (err) {
    console.error("getAllEmployees", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const findEmployeeById = async (req, res) => {
  try {
    const row = await db.employee.findByPk(req.params.id);
    if (!row) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }
    return res.status(200).json(Response.sendResponse(true, row, null, 200));
  } catch (err) {
    console.error("findEmployeeById", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id, ...rest } = req.body;
    const existing = await db.employee.findByPk(id);
    if (!existing) {
      return res.status(404).json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }

    await db.employee.update(rest, { where: { id } });
    const updated = await db.employee.findByPk(id);
    recordActivity(req, {
      action: "employee.update",
      entity_type: "employee",
      entity_id: id,
      entity_label: employeeLabel(updated),
      metadata: { changed_fields: Object.keys(rest) },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, EMPLOYEE_CONSTANTS.UPDATED, 200));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, uniqueViolationMessage(err), 400));
    }
    console.error("updateEmployee", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const existing = await db.employee.findByPk(req.params.id);
    const destroyed = await db.employee.destroy({ where: { id: req.params.id } });
    if (!destroyed) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }
    recordActivity(req, {
      action: "employee.delete",
      entity_type: "employee",
      entity_id: req.params.id,
      entity_label: employeeLabel(existing),
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, destroyed, EMPLOYEE_CONSTANTS.DELETED, 200));
  } catch (err) {
    console.error("deleteEmployee", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const markEmployeeLeft = async (req, res) => {
  try {
    const existing = await db.employee.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }
    if (existing.left_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ALREADY_LEFT, 400));
    }

    // Safety net — mirrors the UI's "return assets first" step so direct API
    // callers can't mark someone as left while they're still holding company
    // gear. Unassign explicitly through /assignment/{id}/unassign first.
    const activeAssignments = await db.assignment.count({
      where: { employee_id: existing.id, unassigned_at: null },
    });
    if (activeAssignments > 0) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            `Employee still has ${activeAssignments} active asset assignment${
              activeAssignments === 1 ? "" : "s"
            }. Return them before marking as left.`,
            400
          )
        );
    }

    const reason = String(req.body.reason || "").trim();
    const leftBy = req.body.left_by ? String(req.body.left_by).trim() : null;

    await db.employee.update(
      {
        left_at: new Date(),
        left_reason: reason,
        left_by: leftBy || null,
      },
      { where: { id: existing.id } }
    );

    const updated = await db.employee.findByPk(existing.id);
    recordActivity(req, {
      action: "employee.mark_left",
      entity_type: "employee",
      entity_id: existing.id,
      entity_label: employeeLabel(updated),
      metadata: { reason, left_by: leftBy },
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, EMPLOYEE_CONSTANTS.LEFT_JOB, 200));
  } catch (err) {
    console.error("markEmployeeLeft", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const rejoinEmployee = async (req, res) => {
  try {
    const existing = await db.employee.findByPk(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }
    if (!existing.left_at) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_LEFT, 400));
    }

    await db.employee.update(
      {
        left_at: null,
        left_reason: null,
        left_by: null,
      },
      { where: { id: existing.id } }
    );

    const updated = await db.employee.findByPk(existing.id);
    recordActivity(req, {
      action: "employee.rejoin",
      entity_type: "employee",
      entity_id: existing.id,
      entity_label: employeeLabel(updated),
    });
    return res
      .status(200)
      .json(Response.sendResponse(true, updated, EMPLOYEE_CONSTANTS.REJOINED, 200));
  } catch (err) {
    console.error("rejoinEmployee", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

const EMPLOYEE_TEMPLATE_HEADERS = ["name", "email", "location", "emp_id"];

const downloadEmployeeTemplate = async (_req, res) => {
  try {
    const buffer = buildTemplateBuffer({
      headers: EMPLOYEE_TEMPLATE_HEADERS,
      examples: [
        ["Jane Cooper", "jane.cooper@acme.co", "Pune", "E-1001"],
        ["Aarav Sharma", "aarav.sharma@acme.co", "Bangalore", "E-1002"],
      ],
      instructions: [
        "InventoryPro — Employee import template",
        "",
        "All four columns are required: name, email, location, emp_id.",
        "",
        "email must be unique across the directory.",
        "emp_id must be unique across the directory.",
        "location should match one of: Pune, Mumbai, Bangalore, Chennai, Hyderabad, Delhi.",
      ],
    });
    return sendXlsxDownload(res, "employee_import_template.xlsx", buffer);
  } catch (err) {
    console.error("downloadEmployeeTemplate", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.ERROR_OCCURED, 500));
  }
};

function basicEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const importEmployees = async (req, res) => {
  try {
    const buffer = readUploadedFileBuffer(req, "file");
    if (!buffer) {
      return res
        .status(400)
        .json(
          Response.sendResponse(
            false,
            null,
            "No file uploaded. Send the xlsx file as a multipart 'file' field.",
            400
          )
        );
    }

    const rows = parseWorkbookRows(buffer);
    if (!rows.length) {
      return res
        .status(400)
        .json(Response.sendResponse(false, null, "Spreadsheet has no data rows.", 400));
    }

    const created = [];
    const errors = [];
    let rowIndex = 1;
    for (const raw of rows) {
      rowIndex += 1;
      try {
        const name = str(raw.name);
        const email = str(raw.email);
        const location = str(raw.location);
        const emp_id = str(raw.emp_id);

        if (!name) throw new Error("name is required");
        if (!email) throw new Error("email is required");
        if (!basicEmailValid(email)) throw new Error(`Invalid email '${email}'`);
        if (!location) throw new Error("location is required");
        if (!emp_id) throw new Error("emp_id is required");

        const row = await db.employee.create({ name, email, location, emp_id });
        created.push({ id: row.id, emp_id: row.emp_id });
      } catch (err) {
        let msg = err.message || "Insert failed";
        if (err.name === "SequelizeUniqueConstraintError") {
          const detail = (err.parent?.detail || err.original?.detail || "").toLowerCase();
          const constraint = (err.parent?.constraint || err.original?.constraint || "").toLowerCase();
          if (detail.includes("email") || constraint.includes("email")) {
            msg = EMPLOYEE_CONSTANTS.DUPLICATE_EMAIL;
          } else if (detail.includes("emp_id") || constraint.includes("emp")) {
            msg = EMPLOYEE_CONSTANTS.DUPLICATE_EMP_ID;
          }
        }
        errors.push({ row: rowIndex, error: msg });
      }
    }

    if (created.length > 0) {
      recordActivity(req, {
        action: "employee.import",
        entity_type: "employee",
        entity_id: null,
        entity_label: `Imported ${created.length} employee${created.length === 1 ? "" : "s"}`,
        metadata: {
          total_rows: rows.length,
          created: created.length,
          failed: errors.length,
          created_items: created,
        },
      });
    }
    return res.status(200).json(
      Response.sendResponse(
        true,
        {
          total: rows.length,
          created: created.length,
          failed: errors.length,
          created_items: created,
          errors,
        },
        `Imported ${created.length} of ${rows.length}`,
        200
      )
    );
  } catch (err) {
    console.error("importEmployees", err);
    return res
      .status(500)
      .json(
        Response.sendResponse(
          false,
          null,
          err.message || EMPLOYEE_CONSTANTS.ERROR_OCCURED,
          500
        )
      );
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  findEmployeeById,
  updateEmployee,
  deleteEmployee,
  markEmployeeLeft,
  rejoinEmployee,
  downloadEmployeeTemplate,
  importEmployees,
};
