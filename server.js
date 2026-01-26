const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static("public"));

/* ===============================
   CONFIGURACIÓN
================================ */
const SECRET_KEY = "CLAVE_SUPER_SECRETA_NO_COMPARTIR";
const QR_EXPIRATION_SECONDS = 20;
const ENTRADAS_FILE = path.join(__dirname, "entradas.json");

/* ===============================
   USUARIOS (DEMO)
================================ */
const USERS = {
  militar_001: {
    perfil: "MILITAR",
    descuento: "15%"
  },
  universitario_001: {
    perfil: "UNIVERSITARIO",
    descuento: "10%"
  },
  vip_001: {
    perfil: "VIP",
    descuento: "30%"
  },
  staff_001: {
    perfil: "STAFF",
    descuento: "ACCESO LIBRE"
  }
};

/* ===============================
   UTILIDADES JSON
================================ */
function leerEntradas() {
  if (!fs.existsSync(ENTRADAS_FILE)) {
    fs.writeFileSync(ENTRADAS_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(ENTRADAS_FILE));
}

function guardarEntradas(data) {
  fs.writeFileSync(ENTRADAS_FILE, JSON.stringify(data, null, 2));
}

/* ===============================
   TOKEN
================================ */
function generarToken(userId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${userId}.${timestamp}`;

  const firma = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}.${firma}`).toString("base64");
}

/* ===============================
   API: GENERAR TOKEN
================================ */
app.get("/api/token/:userId", (req, res) => {
  const { userId } = req.params;

  if (!USERS[userId]) {
    return res.status(404).json({ error: "Usuario no existe" });
  }

  res.json({ token: generarToken(userId) });
});

/* ===============================
   VALIDACIÓN BASE (COMÚN)
================================ */
function validarToken(token) {
  const decoded = Buffer.from(token, "base64").toString("utf8");
  const [userId, timestamp, firma] = decoded.split(".");

  if (!userId || !timestamp || !firma) {
    return { valido: false, motivo: "Token malformado" };
  }

  const ahora = Math.floor(Date.now() / 1000);
  if (ahora - timestamp > QR_EXPIRATION_SECONDS) {
    return { valido: false, motivo: "QR caducado" };
  }

  const data = `${userId}.${timestamp}`;
  const firmaEsperada = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");

  if (firma !== firmaEsperada) {
    return { valido: false, motivo: "QR inválido" };
  }

  const user = USERS[userId];
  if (!user) {
    return { valido: false, motivo: "Usuario no autorizado" };
  }

  return { valido: true, userId, user };
}

/* ===============================
   ENTRADA / SEGURIDAD
================================ */
app.get("/api/validar/entrada", (req, res) => {
  const { token } = req.query;
  const resultado = validarToken(token);

  if (!resultado.valido) return res.json(resultado);

  const entradas = leerEntradas();

  if (entradas[resultado.userId]?.entro) {
    return res.json({
      valido: false,
      motivo: "Usuario ya ingresó"
    });
  }

  entradas[resultado.userId] = {
    entro: true,
    hora: new Date().toISOString()
  };

  guardarEntradas(entradas);

  res.json({
    valido: true,
    accion: "ENTRADA PERMITIDA",
    perfil: resultado.user.perfil
  });
});

/* ===============================
   BARRA / DESCUENTOS
================================ */
app.get("/api/validar/barra", (req, res) => {
  const { token } = req.query;
  const resultado = validarToken(token);

  if (!resultado.valido) return res.json(resultado);

  const entradas = leerEntradas();

  if (!entradas[resultado.userId]?.entro) {
    return res.json({
      valido: false,
      motivo: "Debe ingresar primero"
    });
  }

  res.json({
    valido: true,
    perfil: resultado.user.perfil,
    descuento: resultado.user.descuento
  });
});

/* ===============================
   PERFIL USUARIO (QR)
================================ */
app.get("/u/:userId", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user.html"));
});

/* ===============================
   SERVIDOR
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
// ===== CLIENTE (DATOS DE PRUEBA) =====
app.get("/api/cliente/:id", (req, res) => {
  res.json({
    nombre: "Juan Pérez",
    tipo: "MILITAR",
    entro: true,
    puntos: 325
  });
});

// ===== QR DINÁMICO DE PRUEBA =====
app.get("/api/cliente/:id/qr", (req, res) => {
  const token = "TOKEN_REAL_" + Date.now();
  res.json({ token });
});
// ===== VALIDAR ENTRADA (PRUEBA) =====
app.get("/api/entrada", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.json({ valido: false, motivo: "Sin QR" });
  }

  // simulamos validación correcta
  res.json({
    valido: true,
    mensaje: "ENTRADA PERMITIDA",
    tipo: "MILITAR"
  });
});
