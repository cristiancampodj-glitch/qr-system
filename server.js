const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
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
app.post("/api/clientes", async (req, res) => {
  const { nombre, email, tipo } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO clientess (nombre, email, tipo, puntos, estado)
       VALUES ($1, $2, $3, 0, 'ACTIVO')
       RETURNING id`,
      [nombre, email, tipo]
    );

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "Error registrando cliente" });
  }
});


/* ===============================
   OBTENER CLIENTE
================================ */
app.get("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    "SELECT nombre, tipo, puntos FROM clientess WHERE id = $1",
    [id]
  );

  res.json(result.rows[0]);
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
app.post("/api/consumir", async (req, res) => {
  const { id } = req.body;

  const euros = 6;
  const paros = euros * 0.7;

  await pool.query(
    "UPDATE clientess SET puntos = puntos + $1 WHERE id = $2",
    [paros, id]
  );

  res.json({ ok: true, paros });
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
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM clientess WHERE email=$1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.json({ ok: false, error: "Usuario no encontrado" });
  }

  const user = result.rows[0];

  // por ahora sin hash (como dijiste)
  if (user.password !== password) {
    return res.json({ ok: false, error: "Contraseña incorrecta" });
  }

  res.json({
    ok: true,
    user: {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      puntos: user.puntos,
      rol: user.tipo === "staff" ? "empleado" : "cliente"
    }
  });
});
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ ok: false, error: "Datos incompletos" });
  }

  try {
    const result = await pool.query(
      "SELECT id, nombre, email, password, tipo AS rol, puntos FROM clientess WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false, error: "Usuario no existe" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ ok: false, error: "Contraseña incorrecta" });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        puntos: user.puntos
      }
    });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Error servidor" });
  }
});
