const { Pool } = require("pg");

// 👇 PEGA AQUÍ TU URL DE CONEXIÓN DE RAILWAY (dentro de las comillas)
const connectionString = "postgresql://postgres:HmCUxPEtXdCIYPoaCORuXxyYZzeGNIKp@yamanote.proxy.rlwy.net:11754/railway"; 

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
  -- Borramos tablas viejas para evitar errores
  DROP TABLE IF EXISTS historial_barra;
  DROP TABLE IF EXISTS historial_entradas;
  DROP TABLE IF EXISTS usuarios;

  -- 1. Tabla de Usuarios (Con soporte para QR Dinámico y Fotos)
  CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100),
      email VARCHAR(100) UNIQUE NOT NULL,
      telefono VARCHAR(20),
      password_hash TEXT NOT NULL,
      rol VARCHAR(20) DEFAULT 'cliente', 
      puntos INTEGER DEFAULT 0,
      doc_foto TEXT,      
      selfie_foto TEXT,   
      qr_secret TEXT,     -- CLAVE SECRETA PARA EL QR QUE CAMBIA
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Historial de Entradas
  CREATE TABLE historial_entradas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 3. Historial de Barra/Puntos
  CREATE TABLE historial_barra (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      producto VARCHAR(100),
      puntos_ganados INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function setup() {
  try {
    console.log("⏳ Conectando y creando tablas...");
    await pool.query(sql);
    console.log("✅ ¡ÉXITO! La base de datos se ha creado correctamente.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }
}

setup();