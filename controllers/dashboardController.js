const { Op } = require("sequelize");
const Response = require("../classes/Response");
const db = require("../config/db.config");

const assetIncludes = [
  { model: db.assetType, as: "assetType", attributes: ["id", "name"] },
  { model: db.assetStatus, as: "assetStatus", attributes: ["id", "name"] },
  { model: db.assetCondition, as: "assetCondition", attributes: ["id", "name"] },
];

function tallyByKey(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

const getDashboardStats = async (_req, res) => {
  try {
    const [
      totalAssets,
      retiredAssets,
      missingAssets,
      usedAssets,
      unusedAssets,
      activeAssignments,
      totalEmployees,
      activeEmployees,
      maintenanceStatusRow,
      assets,
      recentActivity,
    ] = await Promise.all([
      db.asset.count(),
      db.asset.count({ where: { retired_at: { [Op.ne]: null } } }),
      db.asset.count({ where: { missing_since: { [Op.ne]: null } } }),
      db.asset.count({ where: { is_used: true } }),
      db.asset.count({ where: { is_used: false } }),
      db.assignment.count({ where: { unassigned_at: null } }),
      db.employee.count(),
      db.employee.count({ where: { left_at: null } }),
      db.assetStatus.findOne({
        where: db.sequelize.where(
          db.sequelize.fn("LOWER", db.sequelize.col("name")),
          "maintenance"
        ),
      }),
      db.asset.findAll({ include: assetIncludes }),
      db.assignment.findAll({
        order: [["updated_at", "DESC"]],
        limit: 10,
        include: [
          {
            model: db.asset,
            as: "asset",
            attributes: ["id", "serial_number", "name_model", "brand", "asset_type_id"],
            include: [
              { model: db.assetType, as: "assetType", attributes: ["id", "name"] },
            ],
          },
          {
            model: db.employee,
            as: "employee",
            attributes: ["id", "name", "emp_id"],
          },
        ],
      }),
    ]);

    const maintenanceAssets = maintenanceStatusRow
      ? await db.asset.count({
          where: {
            asset_status_id: maintenanceStatusRow.id,
            retired_at: null,
            missing_since: null,
          },
        })
      : 0;

    // "Healthy" = not retired and not missing. Available = healthy - active assignments.
    const healthy = totalAssets - retiredAssets - missingAssets;
    const availableAssets = Math.max(0, healthy - activeAssignments);
    const utilizationPct = healthy
      ? Math.round((activeAssignments / healthy) * 100)
      : 0;

    // Group counts from the already-fetched assets list.
    const byTypeMap = tallyByKey(assets, (a) => a.assetType?.name);
    const byStatusMap = tallyByKey(assets, (a) => a.assetStatus?.name);
    const byConditionMap = tallyByKey(assets, (a) => a.assetCondition?.name);
    const byLocationMap = tallyByKey(assets, (a) => a.location);

    const mapToSortedArray = (m) =>
      Array.from(m.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const result = {
      kpis: {
        total_assets: totalAssets,
        active_assignments: activeAssignments,
        available_assets: availableAssets,
        retired_assets: retiredAssets,
        missing_assets: missingAssets,
        maintenance_assets: maintenanceAssets,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        used_assets: usedAssets,
        unused_assets: unusedAssets,
        utilization_pct: utilizationPct,
      },
      by_type: mapToSortedArray(byTypeMap),
      by_status: mapToSortedArray(byStatusMap),
      by_condition: mapToSortedArray(byConditionMap),
      by_location: mapToSortedArray(byLocationMap).slice(0, 10),
      recent_activity: recentActivity,
    };

    return res.status(200).json(Response.sendResponse(true, result, null, 200));
  } catch (err) {
    console.error("getDashboardStats", err);
    return res
      .status(500)
      .json(Response.sendResponse(false, null, "Failed to load dashboard stats", 500));
  }
};

module.exports = { getDashboardStats };
