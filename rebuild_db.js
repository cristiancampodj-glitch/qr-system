const { Pool } = require("pg");

// 👇 PEGA AQUÍ TU URL PÚBLICA DE RAILWAY (la que copiaste de "Connect")
const connectionString = "postgresql://postgres:nUhUiTIKWlqVoNjgkQBGEMPcEUlKqSxZ@hopper.proxy.rlwy.net:30867/railway"; 

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
  DROP TABLE IF EXISTS historial_barra;
  DROP TABLE IF EXISTS historial_entradas;
  DROP TABLE IF EXISTS usuarios;

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
      qr_secret TEXT,     
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE historial_entradas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE historial_barra (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      producto VARCHAR(100),
      puntos_ganados INTEGER,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function rebuild() {
  try {
    console.log("⏳ Limpiando y creando tablas en Railway...");
    await pool.query(sql);
    console.log("✅ Base de datos restaurada con éxito.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error restaurando base de datos:", e);
    process.exit(1);
  }
}

rebuild();