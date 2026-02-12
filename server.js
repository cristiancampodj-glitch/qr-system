const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const path = require("path");
const multer = require("multer");
const { authenticator } = require("otplib"); 
const QRCode = require("qrcode"); 

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); 

// CONFIGURACIÓN QR DINÁMICO (Paso de 15 segundos para máxima seguridad)
authenticator.options = { step: 15, window: 1 }; 

// CONEXIÓN A POSTGRESQL (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) return console.error('❌ Error de conexión a la DB:', err.stack);
  console.log('✅ Conexión a PostgreSQL establecida correctamente');
  release();
});

// CONFIGURACIÓN DE ALMACENAMIENTO DE FOTOS
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage });

// --- REDIRECCIÓN INICIAL ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// --- 1. REGISTRO DE USUARIOS ---
app.post("/api/crear-usuario", upload.fields([{ name: 'docFoto' }, { name: 'selfie' }]), async (req, res) => {
  try {
    const { nombre, email, telefono, tipo, password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: "Contraseña requerida." });

    const docPath = req.files['docFoto'] ? '/uploads/' + req.files['docFoto'][0].filename : null;
    const selfiePath = req.files['selfie'] ? '/uploads/' + req.files['selfie'][0].filename : null;
    const hash = await bcrypt.hash(password, 10);
    const qrSecret = authenticator.generateSecret(); 

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash, rol, puntos, doc_foto, selfie_foto, qr_secret) 
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8) RETURNING id`,
      [nombre, email, telefono, hash, tipo, docPath, selfiePath, qrSecret]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error en registro:", err);
    if (err.code === '23505') return res.status(400).json({ success: false, error: "El correo ya existe." });
    res.status(500).json({ success: false, error: "Error interno." });
  }
});

// --- 2. LOGIN (CON BLOQUEO POR VETO) ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.json({ ok: false, error: "Usuario no encontrado" });

    const user = result.rows[0];

    // 🛡️ Si el usuario está vetado, no lo dejamos entrar
    if (user.vetado) {
        return res.json({ ok: false, error: "ACCESO DENEGADO: Tu cuenta ha sido vetada por infringir las normas." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ ok: false, error: "Contraseña incorrecta" });

    res.json({ ok: true, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Error de servidor" });
  }
});

// --- 3. GENERAR QR DINÁMICO (CLIENTE) ---
app.get("/api/qr/live/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT qr_secret, nombre, vetado FROM usuarios WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send("Usuario no encontrado");
    
    // Si está vetado no generamos el código
    if (result.rows[0].vetado) return res.status(403).json({ error: "Usuario vetado" });

    const user = result.rows[0];
    const token = authenticator.generate(user.qr_secret);
    const dataString = `${req.params.id}|${token}`;
    const qrImage = await QRCode.toDataURL(dataString);

    res.json({ qrImage, nombre: user.nombre });
  } catch (err) {
    res.status(500).json({ error: "Error generando QR" });
  }
});

// --- 4. VALIDAR ENTRADA (SEGURIDAD) ---
app.get("/api/entrada", async (req, res) => {
  const { codigo } = req.query; 
  try {
    if (!codigo || !codigo.includes("|")) return res.json({ ok: false, msg: "QR no válido" });

    const [id, token] = codigo.split("|");
    const userResult = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    
    if (userResult.rows.length === 0) return res.json({ ok: false, msg: "Usuario inexistente" });

    const user = userResult.rows[0];

    // 🛡️ Comprobar Veto
    if (user.vetado) return res.json({ ok: false, msg: "⛔ USUARIO VETADO", id: user.id });

    const isValid = authenticator.check(token, user.qr_secret);
    if (!isValid) return res.json({ ok: false, msg: "⛔ QR CADUCADO", id: user.id });

    await pool.query("INSERT INTO historial_entradas (usuario_id) VALUES ($1)", [id]);

    res.json({ 
      ok: true, 
      id: user.id, 
      nombre: user.nombre, 
      tipo: user.rol, 
      foto: user.selfie_foto 
    });
  } catch (err) {
    res.json({ ok: false, msg: "Error al validar" });
  }
});

// --- ACCIÓN DE VETAR CON MOTIVO (SEGURIDAD) ---
app.post("/api/seguridad/vetar", async (req, res) => {
    const { id, motivo } = req.body;
    try {
        await pool.query(
            "UPDATE usuarios SET vetado = TRUE, motivo_veto = $1 WHERE id = $2", 
            [motivo || "Sin motivo especificado", id]
        );
        res.json({ ok: true, msg: "Usuario vetado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: "Error al procesar el veto" });
    }
});

// --- 5. BARRA (PUNTOS) ---
app.get("/api/barra", async (req, res) => {
    const { token } = req.query; 
    const userId = token.includes("|") ? token.split("|")[0] : token;
    try {
      const puntosGanados = 10;
      await pool.query("UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2", [puntosGanados, userId]);
      await pool.query("INSERT INTO historial_barra (usuario_id, producto, puntos_ganados) VALUES ($1, 'Consumición', $2)", [userId, puntosGanados]);
      const user = await pool.query("SELECT nombre, puntos FROM usuarios WHERE id = $1", [userId]);
      res.json({ ok: true, perfil: user.rows[0].nombre, puntos: user.rows[0].puntos });
    } catch (err) { res.json({ ok: false }); }
});

// --- 6. ADMIN (MÉTRICAS Y GESTIÓN) ---
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
  } catch (err) { res.status(500).json({ error: "Error datos" }); }
});

// Obtener lista negra con motivos
app.get("/api/admin/blacklist", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre, email, motivo_veto, creado_en FROM usuarios WHERE vetado = TRUE ORDER BY creado_en DESC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener la lista negra" });
    }
});

// Quitar el veto (Indulto)
app.post("/api/admin/quitar-veto", async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query("UPDATE usuarios SET vetado = FALSE, motivo_veto = NULL WHERE id = $1", [id]);
        res.json({ ok: true, msg: "Veto removido correctamente" });
    } catch (err) {
        res.status(500).json({ error: "Error al remover el veto" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Paröle activo en puerto ${PORT}`));