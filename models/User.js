const { query } = require("../config/db");

const TABLE = "users";

const LOGIN_TYPE = Object.freeze({
  EMAIL: 1,
  GOOGLE: 2,
  MICROSOFT: 3,
});

const User = {
  tableName: TABLE,
  LOGIN_TYPE,

  async findByEmail(email) {
    const { rows } = await query(
      `SELECT * FROM ${TABLE} WHERE email = $1 LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findByMicrosoftId(microsoftId) {
    const { rows } = await query(
      `SELECT * FROM ${TABLE} WHERE microsoft_id = $1 LIMIT 1`,
      [microsoftId]
    );
    return rows[0] || null;
  },

  async upsertFromMicrosoftProfile(profile) {
    const email =
      (profile.emails && profile.emails[0] && profile.emails[0].value) ||
      (profile._json && (profile._json.mail || profile._json.userPrincipalName)) ||
      null;

    if (!email) {
      throw new Error("Microsoft profile did not return an email");
    }

    const microsoftId = profile.id || null;
    const displayName = profile.displayName || null;
    const givenName = (profile.name && profile.name.givenName) || null;
    const familyName = (profile.name && profile.name.familyName) || null;

    const { rows } = await query(
      `INSERT INTO ${TABLE}
         (email, display_name, given_name, family_name, microsoft_id, login_type, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, ${TABLE}.display_name),
         given_name   = COALESCE(EXCLUDED.given_name,   ${TABLE}.given_name),
         family_name  = COALESCE(EXCLUDED.family_name,  ${TABLE}.family_name),
         microsoft_id = COALESCE(EXCLUDED.microsoft_id, ${TABLE}.microsoft_id),
         login_type   = EXCLUDED.login_type,
         last_login   = NOW()
       RETURNING *`,
      [email, displayName, givenName, familyName, microsoftId, LOGIN_TYPE.MICROSOFT]
    );
    return rows[0];
  },

  async touchLastLogin(id) {
    await query(`UPDATE ${TABLE} SET last_login = NOW() WHERE id = $1`, [id]);
  },

  async findAll() {
    const { rows } = await query(
      `SELECT id, email, display_name, given_name, family_name, microsoft_id, login_type,
              is_active, last_login, created_at, updated_at
       FROM ${TABLE}
       ORDER BY created_at DESC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT id, email, display_name, given_name, family_name, microsoft_id, login_type,
              is_active, last_login, created_at, updated_at
       FROM ${TABLE} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async update(id, patch) {
    const allowed = new Set(["display_name", "given_name", "family_name", "is_active"]);
    const entries = Object.entries(patch).filter(
      ([k, v]) => allowed.has(k) && v !== undefined
    );
    if (!entries.length) {
      return User.findById(id);
    }

    const params = [];
    const sets = [];
    let p = 1;
    for (const [key, val] of entries) {
      sets.push(`${key} = $${p}`);
      params.push(val);
      p += 1;
    }
    sets.push("updated_at = NOW()");
    params.push(id);
    const idPlaceholder = p;

    await query(
      `UPDATE ${TABLE} SET ${sets.join(", ")} WHERE id = $${idPlaceholder}`,
      params
    );
    return User.findById(id);
  },

  async remove(id) {
    const { rowCount } = await query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
    return rowCount;
  },

  async create({
    email,
    display_name = null,
    given_name = null,
    family_name = null,
    is_active = true,
    login_type = LOGIN_TYPE.EMAIL,
  }) {
    const { rows } = await query(
      `INSERT INTO ${TABLE}
         (email, display_name, given_name, family_name, microsoft_id, login_type, is_active)
       VALUES ($1, $2, $3, $4, NULL, $5, $6)
       RETURNING id, email, display_name, given_name, family_name, microsoft_id, login_type,
                 is_active, last_login, created_at, updated_at`,
      [email, display_name, given_name, family_name, login_type, is_active]
    );
    return rows[0];
  },
};

module.exports = User;
