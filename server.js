const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   POSTGRES
================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT NOW()")
  .then(res => console.log("✅ Postgres conectado:", res.rows[0]))
  .catch(err => console.error("❌ Error Postgres:", err));

/* ===============================
   CONFIG
================================ */
const SECRET_KEY = "CLAVE_SUPER_SECRETA";
const QR_EXPIRATION_SECONDS = 20;

/* ===============================
   TOKEN QR
================================ */
function generarToken(id) {
  const ts = Math.floor(Date.now() / 1000);
  const base = `${id}.${ts}`;
  const firma = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(base)
    .digest("hex");

  return Buffer.from(`${base}.${firma}`).toString("base64");
}

function validarToken(token) {
  try {
    const raw = Buffer.from(token, "base64").toString("utf8");
    const [id, ts, firma] = raw.split(".");
    if (!id || !ts || !firma) return null;

    if (Date.now() / 1000 - ts > QR_EXPIRATION_SECONDS) return null;

    const check = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(`${id}.${ts}`)
      .digest("hex");

    return firma === check ? id : null;
  } catch {
    return null;
  }
}

/* ===============================
   REGISTRO CLIENTE (RRPP)
================================ */
app.post("/api/registrar-cliente", async (req, res) => {
  const { nombre, contacto, tipo } = req.body;

  if (!nombre || !contacto || !tipo) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO clientes (nombre, contacto, tipo)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nombre, contacto, tipo]
    );

    res.json({
      ok: true,
      id: result.rows[0].id
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.json({ error: "Cliente ya registrado" });
    }
    console.error(err);
    res.status(500).json({ error: "Error servidor" });
  }
});

/* ===============================
   OBTENER CLIENTE
================================ */
app.get("/api/cliente/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, nombre, tipo, puntos FROM clientess WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no existe" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo cliente" });
  }
});


/* ===============================
   TOKEN QR CLIENTE
================================ */
app.get("/api/token/:id", (req, res) => {
  res.json({ token: generarToken(req.params.id) });
});

/* ===============================
   SUMAR PUNTOS (BARRA)
================================ */
app.post("/api/barra", async (req, res) => {
  const id = validarToken(req.body.token);
  if (!id) return res.json({ ok: false });

  const result = await pool.query(
    `UPDATE clientes
     SET puntos = puntos + 5
     WHERE id=$1
     RETURNING puntos`,
    [id]
  );

  res.json({
    ok: true,
    puntos: result.rows[0].puntos
  });
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Servidor activo en puerto " + PORT)
);
