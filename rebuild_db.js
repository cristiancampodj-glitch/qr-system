const { Pool } = require("pg");

// Usa la variable de entorno de Railway, o tu URL local para pruebas
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
    console.log("⏳ Limpiando y creando tablas en Railway...");
    // Ejecutamos la consulta
    await pool.query(sql);
    console.log("✅ Base de datos restaurada con éxito (Tablas: usuarios, entradas, barra).");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error restaurando base de datos:", e);
    process.exit(1);
  }
}

rebuild();