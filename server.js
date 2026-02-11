const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const path = require("path");
const multer = require("multer");
const { authenticator } = require("otplib"); // Para códigos de 15 segundos
const QRCode = require("qrcode"); // Para dibujar el QR

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Sirve tus archivos y las fotos

// CONFIGURACIÓN QR DINÁMICO (15 SEGUNDOS)
authenticator.options = { step: 15, window: 1 }; 

// CONEXIÓN BASE DE DATOS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// SUBIDA DE ARCHIVOS (FOTOS)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    // Nombre único para que no se sobrescriban
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage });


// --- 1. REGISTRO (CON FOTOS Y SECRETO DE SEGURIDAD) ---
app.post("/api/crear-usuario", upload.fields([{ name: 'docFoto' }, { name: 'selfie' }]), async (req, res) => {
  try {
    const { nombre, email, telefono, tipo, clave } = req.body;
    
    // Rutas de las fotos
    const docPath = req.files['docFoto'] ? '/uploads/' + req.files['docFoto'][0].filename : null;
    const selfiePath = req.files['selfie'] ? '/uploads/' + req.files['selfie'][0].filename : null;

    const hash = await bcrypt.hash(clave || "123456", 10);
    
    // GENERAMOS EL SECRETO ÚNICO PARA ESTE USUARIO (Para que su QR sea único)
    const qrSecret = authenticator.generateSecret(); 

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash, rol, puntos, doc_foto, selfie_foto, qr_secret) 
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8) RETURNING id`,
      [nombre, email, telefono, hash, tipo, docPath, selfiePath, qrSecret]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error registro:", err);
    if (err.code === '23505') return res.status(400).json({ success: false, error: "El correo ya existe." });
    res.status(500).json({ success: false, error: "Error interno." });
  }
});

// --- 2. LOGIN ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.json({ ok: false, error: "Usuario no encontrado" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ ok: false, error: "Contraseña incorrecta" });

    res.json({ ok: true, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Error de servidor" });
  }
});

// --- 3. GENERAR QR DINÁMICO (PARA EL PASE DEL CLIENTE) ---
app.get("/api/qr/live/:id", async (req, res) => {
  try {
    // Buscamos el secreto del usuario
    const result = await pool.query("SELECT qr_secret, nombre FROM usuarios WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send("Usuario no encontrado");

    const user = result.rows[0];
    
    // Si es un usuario viejo sin secreto, esto fallaría. (En producción habría que manejarlo)
    if (!user.qr_secret) return res.status(500).json({error: "Usuario antiguo. Re-crear cuenta."});

    // 1. Generamos el token temporal (Ej: "849201")
    const token = authenticator.generate(user.qr_secret);
    
    // 2. Empaquetamos ID + TOKEN (Ej: "5|849201")
    const dataString = `${req.params.id}|${token}`;

    // 3. Convertimos a imagen QR
    const qrImage = await QRCode.toDataURL(dataString);

    res.json({ qrImage, nombre: user.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando QR" });
  }
});

// --- 4. VALIDAR ENTRADA (PARA EL GUARDIA) ---
app.get("/api/entrada", async (req, res) => {
  const { codigo } = req.query; // Esperamos algo como "5|849201"
  
  try {
    if (!codigo || !codigo.includes("|")) return res.json({ ok: false, msg: "Formato QR Inválido" });

    const [id, token] = codigo.split("|"); // Separamos ID y Token

    const userResult = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (userResult.rows.length === 0) return res.json({ ok: false, msg: "Usuario no existe" });

    const user = userResult.rows[0];

    // LA MAGIA: Verificamos si el token corresponde al secreto en este instante
    const isValid = authenticator.check(token, user.qr_secret);

    if (!isValid) {
      return res.json({ ok: false, msg: "⛔ QR CADUCADO o FALSO" });
    }

    // Si es válido, registramos la entrada
    await pool.query("INSERT INTO historial_entradas (usuario_id) VALUES ($1)", [id]);

    res.json({ 
      ok: true, 
      nombre: user.nombre, 
      tipo: user.rol, 
      foto: user.selfie_foto 
    });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, msg: "Error de servidor" });
  }
});

// --- 5. BARRA (PUNTOS) ---
app.get("/api/barra", async (req, res) => {
    const { token } = req.query; 
    // Si el lector lee el QR completo "ID|TOKEN", nos quedamos solo con el ID
    const userId = token.includes("|") ? token.split("|")[0] : token;

    try {
      const puntosGanados = 10;
      await pool.query("UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2", [puntosGanados, userId]);
      await pool.query("INSERT INTO historial_barra (usuario_id, producto, puntos_ganados) VALUES ($1, 'Consumición', $2)", [userId, puntosGanados]);
  
      const user = await pool.query("SELECT nombre, puntos FROM usuarios WHERE id = $1", [userId]);
      
      if(user.rows.length > 0) {
        res.json({ ok: true, perfil: user.rows[0].nombre, puntos: user.rows[0].puntos });
      } else {
        res.json({ ok: false, msg: "Usuario no encontrado" });
      }
    } catch (err) {
      console.error(err);
      res.json({ ok: false });
    }
});

// --- 6. ESTADÍSTICAS (ADMIN) ---
app.get("/api/admin/stats", async (req, res) => {
  try {
    const totalUsuarios = await pool.query("SELECT COUNT(*) FROM usuarios WHERE rol NOT IN ('admin', 'seguridad', 'barra')");
    const totalEntradas = await pool.query("SELECT COUNT(*) FROM historial_entradas");
    const totalConsumos = await pool.query("SELECT COUNT(*) FROM historial_barra");
    const topClientes = await pool.query("SELECT nombre, puntos, rol FROM usuarios WHERE rol NOT IN ('admin', 'seguridad', 'barra') ORDER BY puntos DESC LIMIT 5");

    res.json({
      usuarios: totalUsuarios.rows[0].count,
      entradas: totalEntradas.rows[0].count,
      consumos: totalConsumos.rows[0].count,
      top: topClientes.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Error stats" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));