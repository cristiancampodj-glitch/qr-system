const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
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
  .then(res => console.log("✅ Postgres conectado"))
  .catch(err => console.error("❌ Error Postgres:", err));

/* ===============================
   LOGIN
================================ */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ ok: false, error: "Datos incompletos" });
  }

  try {
    const result = await pool.query(
      "SELECT id, nombre, email, password_hash, tipo, puntos FROM clientess WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: false, error: "Usuario no existe" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.json({ ok: false, error: "Contraseña incorrecta" });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.tipo,   // VIP / STAFF / CLIENTE
        puntos: user.puntos
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error servidor" });
  }
});


/* ===============================
   REGISTRO CLIENTE (ADMIN)
================================ */
app.post("/api/clientes", async (req, res) => {
  const { nombre, email, password, tipo } = req.body;

  if (!nombre || !email || !password || !tipo) {
    return res.json({ ok: false, error: "Datos incompletos" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO clientess (nombre, email, password_hash, tipo, puntos, estado)
       VALUES ($1, $2, $3, $4, 0, 'ACTIVO')
       RETURNING id`,
      [nombre, email, hash, tipo]
    );

    res.json({ ok: true, id: result.rows[0].id });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Error registrando cliente" });
  }
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto " + PORT);
});
