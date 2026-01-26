const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query("SELECT NOW()")
  .then(res => console.log("Postgres conectado:", res.rows[0]))
  .catch(err => console.error("Error Postgres:", err));

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   CONFIG
================================ */
const SECRET_KEY = "CLAVE_SUPER_SECRETA_NO_COMPARTIR";
const QR_EXPIRATION_SECONDS = 20;

const DATA = (file) => path.join(__dirname, "data", file);
const readJSON = (file) => JSON.parse(fs.readFileSync(DATA(file)));
const writeJSON = (file, data) =>
  fs.writeFileSync(DATA(file), JSON.stringify(data, null, 2));

/* ===============================
   TOKEN
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
   CLIENTE
================================ */


app.get("/api/token/:id", (req, res) => {
  res.json({ token: generarToken(req.params.id) });
});

/* ===============================
   SEGURIDAD (ENTRADA)
================================ */
app.get("/api/entrada", (req, res) => {
  const id = validarToken(req.query.token);
  if (!id) return res.json({ ok: false });

  const entradas = readJSON("entradas.json");
  if (entradas[id]) {
    return res.json({ ok: false, motivo: "YA INGRESÓ" });
  }

  entradas[id] = new Date().toISOString();
  writeJSON("entradas.json", entradas);

  res.json({ ok: true });
});

/* ===============================
   BARRA
================================ */
app.get("/api/barra", (req, res) => {
  const id = validarToken(req.query.token);
  if (!id) return res.json({ ok: false });

  const entradas = readJSON("entradas.json");
  if (!entradas[id]) {
    return res.json({ ok: false, motivo: "NO HA INGRESADO" });
  }

  const clientes = readJSON("clientes.json");
  clientes[id].puntos += 5;
  writeJSON("clientes.json", clientes);

  res.json({
    ok: true,
    perfil: clientes[id].perfil,
    puntos: clientes[id].puntos
  });
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 3000;


function leerClientes() {
  if (!fs.existsSync(CLIENTES_FILE)) {
    fs.writeFileSync(CLIENTES_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(CLIENTES_FILE));
}

function guardarClientes(data) {
  fs.writeFileSync(CLIENTES_FILE, JSON.stringify(data, null, 2));
}



app.listen(PORT, () =>
  console.log("Servidor activo en puerto " + PORT)
);
app.use(express.json());
