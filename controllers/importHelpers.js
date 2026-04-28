const fs = require("fs");
const XLSX = require("xlsx");

// Hard cap for Excel uploads — a normal asset/employee template is well
// under 1MB. We refuse anything larger to keep zip-bomb / DoS surface small.
const MAX_EXCEL_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXCEL_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "application/octet-stream", // some browsers send this for xlsx
]);

const ALLOWED_EXCEL_EXTS = new Set([".xlsx", ".xls"]);

// xlsx is a zip archive (PK\x03\x04); xls is OLE2 (D0CF11E0A1B11AE1).
// Magic-byte check stops anyone from renaming a script to .xlsx.
function looksLikeExcel(buf) {
  if (!buf || buf.length < 8) return false;
  const xlsxMagic = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  const xlsMagic =
    buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0 &&
    buf[4] === 0xa1 && buf[5] === 0xb1 && buf[6] === 0x1a && buf[7] === 0xe1;
  return xlsxMagic || xlsMagic;
}

function pickFile(req, fieldName) {
  if (req.files && req.files[fieldName]) {
    return Array.isArray(req.files[fieldName]) ? req.files[fieldName][0] : req.files[fieldName];
  }
  if (req.body && req.body[fieldName]) return req.body[fieldName];
  return null;
}

/**
 * Reads + validates an uploaded Excel file. Returns `{ buffer }` on success
 * or `{ error }` on validation failure. Always cleans up the temp file.
 */
function readUploadedExcelBuffer(req, fieldName = "file") {
  const file = pickFile(req, fieldName);
  if (!file) {
    return { error: "No file uploaded. Send the xlsx file as a multipart 'file' field." };
  }
  const tmpPath = file.filepath || file.path;
  const cleanup = () => {
    if (!tmpPath) return;
    try { fs.unlinkSync(tmpPath); } catch { /* best-effort */ }
  };
  if (!tmpPath) {
    return { error: "Upload failed: no readable file path." };
  }

  // Size: prefer the formidable-reported size (cheap, available pre-read).
  const reportedSize = typeof file.size === "number" ? file.size : null;
  if (reportedSize !== null && reportedSize > MAX_EXCEL_BYTES) {
    cleanup();
    return { error: "File too large. Maximum allowed size is 5 MB." };
  }

  // Extension allowlist.
  const name = String(file.originalFilename || file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (ext && !ALLOWED_EXCEL_EXTS.has(ext)) {
    cleanup();
    return { error: "Only .xlsx and .xls files are accepted." };
  }

  // MIME allowlist (best-effort — browser-provided, not trustworthy on its own,
  // but rejects obviously wrong types early).
  const mime = String(file.mimetype || file.type || "").toLowerCase();
  if (mime && !ALLOWED_EXCEL_MIME.has(mime)) {
    cleanup();
    return { error: "Unsupported file type. Upload an Excel (.xlsx) file." };
  }

  let buffer;
  try {
    buffer = fs.readFileSync(tmpPath);
  } catch {
    cleanup();
    return { error: "Could not read uploaded file." };
  }
  cleanup();

  if (buffer.length > MAX_EXCEL_BYTES) {
    return { error: "File too large. Maximum allowed size is 5 MB." };
  }
  if (!looksLikeExcel(buffer)) {
    return { error: "File does not look like a valid Excel workbook." };
  }
  return { buffer };
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
  readUploadedExcelBuffer,
  parseWorkbookRows,
  buildTemplateBuffer,
  sendXlsxDownload,
  str,
  dateYMD,
  num,
};
