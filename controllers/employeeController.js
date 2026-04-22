const Response = require("../classes/Response");
const db = require("../config/db.config");
const EMPLOYEE_CONSTANTS = require("../constants/employeeConstants");

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
    const destroyed = await db.employee.destroy({ where: { id: req.params.id } });
    if (!destroyed) {
      return res
        .status(404)
        .json(Response.sendResponse(false, null, EMPLOYEE_CONSTANTS.NOT_FOUND, 404));
    }
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

module.exports = {
  createEmployee,
  getAllEmployees,
  findEmployeeById,
  updateEmployee,
  deleteEmployee,
};
