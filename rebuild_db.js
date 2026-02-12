const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:nUhUiTIKWlqVoNjgkQBGEMPcEUlKqSxZ@hopper.proxy.rlwy.net:30867/railway"; 

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
  DROP TABLE IF EXISTS historial_barra CASCADE;
  DROP TABLE IF EXISTS historial_entradas CASCADE;
  DROP TABLE IF EXISTS usuarios CASCADE;

  CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT,
      password_hash TEXT NOT NULL,
      rol TEXT DEFAULT 'Cliente', 
      puntos INTEGER DEFAULT 0,
      doc_foto TEXT,      
      selfie_foto TEXT,   
      qr_secret TEXT,     
      vetado BOOLEAN DEFAULT FALSE, 
      motivo_veto TEXT, -- ✍️ NUEVA COLUMNA PARA EL REGISTRO DE INCIDENCIAS
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE historial_entradas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE historial_barra (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      producto TEXT,
      puntos_ganados INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function rebuild() {
  try {
    console.log("⏳ Reconstruyendo base de datos con soporte para Bitácora de Veto...");
    await pool.query(sql);
    console.log("✅ Base de datos restaurada. Columna 'motivo_veto' añadida con éxito.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error restaurando base de datos:", e);
    process.exit(1);
  }
}

rebuild();