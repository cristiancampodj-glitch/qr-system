const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

const SECRET_KEY = "CLAVE_SUPER_SECRETA_NO_COMPARTIR";
const USER_ID = "militar_001";

function generarToken(userId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${userId}.${timestamp}`;

  const firma = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}.${firma}`).toString("base64");
}

app.get("/api/token", (req, res) => {
  const token = generarToken(USER_ID);
  res.json({ token });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

app.get("/api/validar", (req, res) => {
  const { token } = req.query;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userId, timestamp, firma] = decoded.split(".");

    const ahora = Math.floor(Date.now() / 1000);
    if (ahora - timestamp > 20) {
      return res.json({ valido: false, motivo: "QR caducado" });
    }

    const data = `${userId}.${timestamp}`;
    const firmaEsperada = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(data)
      .digest("hex");

    if (firma !== firmaEsperada) {
      return res.json({ valido: false, motivo: "QR inválido" });
    }

    res.json({
      valido: true,
      tipo: "MILITAR",
      descuento: "15%"
    });

  } catch (e) {
    res.json({ valido: false, motivo: "Token incorrecto" });
  }
});
