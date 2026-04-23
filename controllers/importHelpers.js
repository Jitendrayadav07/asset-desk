const fs = require("fs");
const XLSX = require("xlsx");

/**
 * Express-form-data (using formidable) stores uploaded files on either
 * `req.files` (pre-union) or `req.body` (post-union). Depending on the
 * formidable version the path property is `path` or `filepath`.
 * Normalizes everything to a Buffer.
 */
function readUploadedFileBuffer(req, fieldName = "file") {
  let file = null;
  if (req.files && req.files[fieldName]) {
    file = Array.isArray(req.files[fieldName])
      ? req.files[fieldName][0]
      : req.files[fieldName];
  } else if (req.body && req.body[fieldName]) {
    file = req.body[fieldName];
  }
  if (!file) {
    return null;
  }
  const path = file.filepath || file.path;
  if (!path) return null;
  try {
    return fs.readFileSync(path);
  } catch {
    return null;
  } finally {
    try {
      fs.unlinkSync(path);
    } catch {
      /* ignore — cleanup best-effort */
    }
  }
}

/** Parse a workbook buffer into an array of plain-object rows from the first sheet. */
function parseWorkbookRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
}

/** Build an xlsx buffer from a headers array + example rows, with a second "Instructions" sheet. */
function buildTemplateBuffer({ headers, examples, instructions }) {
  const wb = XLSX.utils.book_new();
  const aoa = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Best-effort column widths
  ws["!cols"] = headers.map((h) => ({
    wch: Math.max(14, String(h).length + 2),
  }));
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  if (instructions && instructions.length) {
    const iws = XLSX.utils.aoa_to_sheet(instructions.map((line) => [line]));
    iws["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, iws, "Instructions");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function sendXlsxDownload(res, filename, buffer) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  return res.end(buffer);
}

/** Normalize a cell to trimmed string or null. */
function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Normalize to a YYYY-MM-DD date string or null. Accepts Excel serials, ISO, date objects. */
function dateYMD(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    // Excel serial date → JS date
    const epoch = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(epoch.getTime()) ? null : epoch.toISOString().slice(0, 10);
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  readUploadedFileBuffer,
  parseWorkbookRows,
  buildTemplateBuffer,
  sendXlsxDownload,
  str,
  dateYMD,
  num,
};
