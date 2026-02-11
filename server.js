const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const path = require("path");
const multer = require("multer");
const { authenticator } = require("otplib"); // Para seguridad de 15 segundos
const QRCode = require("qrcode"); // Para generar la imagen del QR

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Sirve HTML, CSS, JS y Fotos subidas

// CONFIGURACIÓN QR DINÁMICO (Cambia cada 15 segundos)
authenticator.options = { step: 15, window: 1 }; 

// CONEXIÓN BASE DE DATOS (Railway usa variables de entorno)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CONFIGURACIÓN DE ALMACENAMIENTO DE FOTOS
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    // Nombre único: fecha + nombre original limpio
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage });

// --- REDIRECCIÓN INICIAL ---
// Al entrar a app.euontech.es, lo primero que verán será el Login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// --- 1. REGISTRO (CON FOTOS Y CONTRASEÑA PERSONALIZADA) ---
app.post("/api/crear-usuario", upload.fields([{ name: 'docFoto' }, { name: 'selfie' }]), async (req, res) => {
  try {
    const { nombre, email, telefono, tipo, password } = req.body;
    
    // Rutas de las imágenes guardadas
    const docPath = req.files['docFoto'] ? '/uploads/' + req.files['docFoto'][0].filename : null;
    const selfiePath = req.files['selfie'] ? '/uploads/' + req.files['selfie'][0].filename : null;

    // Encriptamos la contraseña proporcionada por el usuario
    const hash = await bcrypt.hash(password, 10);
    
    // Generamos un secreto único para el TOTP de este usuario
    const qrSecret = authenticator.generateSecret(); 

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash, rol, puntos, doc_foto, selfie_foto, qr_secret) 
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8) RETURNING id`,
      [nombre, email, telefono, hash, tipo, docPath, selfiePath, qrSecret]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error en registro:", err);
    if (err.code === '23505') return res.status(400).json({ success: false, error: "El correo ya está registrado." });
    res.status(500).json({ success: false, error: "Error interno al registrar usuario." });
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

    // Enviamos datos básicos para redirección en el frontend
    res.json({ ok: true, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Error de servidor en el login" });
  }
});

// --- 3. GENERAR QR DINÁMICO (PARA PASE CLIENTE) ---
app.get("/api/qr/live/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT qr_secret, nombre FROM usuarios WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send("Usuario no encontrado");

    const user = result.rows[0];
    if (!user.qr_secret) return res.status(500).json({error: "Usuario sin configuración de seguridad"});

    // Generamos token temporal de 6 dígitos
    const token = authenticator.generate(user.qr_secret);
    
    // El QR contiene: ID del usuario + el token actual
    const dataString = `${req.params.id}|${token}`;

    const qrImage = await QRCode.toDataURL(dataString);
    res.json({ qrImage, nombre: user.nombre });
  } catch (err) {
    res.status(500).json({ error: "Error generando código dinámico" });
  }
});

// --- 4. VALIDAR ENTRADA (SEGURIDAD) ---
app.get("/api/entrada", async (req, res) => {
  const { codigo } = req.query; // Recibe "ID|TOKEN"
  
  try {
    if (!codigo || !codigo.includes("|")) return res.json({ ok: false, msg: "QR no válido" });

    const [id, token] = codigo.split("|");

    const userResult = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (userResult.rows.length === 0) return res.json({ ok: false, msg: "Usuario inexistente" });

    const user = userResult.rows[0];

    // Verificamos si el token es válido en este preciso momento (ventana de 15s)
    const isValid = authenticator.check(token, user.qr_secret);

    if (!isValid) return res.json({ ok: false, msg: "⛔ QR CADUCADO O INVÁLIDO" });

    // Registro de entrada exitosa
    await pool.query("INSERT INTO historial_entradas (usuario_id) VALUES ($1)", [id]);

    res.json({ 
      ok: true, 
      nombre: user.nombre, 
      tipo: user.rol, 
      foto: user.selfie_foto 
    });

  } catch (err) {
    res.json({ ok: false, msg: "Error al validar entrada" });
  }
});

// --- 5. BARRA (PUNTOS POR CONSUMO) ---
app.get("/api/barra", async (req, res) => {
    const { token } = req.query; 
    const userId = token.includes("|") ? token.split("|")[0] : token;

    try {
      const puntosGanados = 10;
      await pool.query("UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2", [puntosGanados, userId]);
      await pool.query("INSERT INTO historial_barra (usuario_id, producto, puntos_ganados) VALUES ($1, 'Consumición', $2)", [userId, puntosGanados]);
  
      const user = await pool.query("SELECT nombre, puntos FROM usuarios WHERE id = $1", [userId]);
      res.json({ ok: true, perfil: user.rows[0].nombre, puntos: user.rows[0].puntos });
    } catch (err) {
      res.json({ ok: false });
    }
});

// --- 6. ADMIN (ESTADÍSTICAS) ---
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
    res.status(500).json({ error: "Error obteniendo datos" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Paröle activo en puerto ${PORT}`));