// ===============================
// validar-barra.js
// Módulo de barra
// ===============================

const readerId = "reader";
const resultado = document.getElementById("resultado");
const btnOtro = document.getElementById("btnOtro");

let qrScanner = null;

// ===============================
// Mostrar resultado visual
// ===============================
function mostrarResultado(html, ok = true) {
  resultado.innerHTML = html;
  resultado.className = "estado " + (ok ? "ok" : "error");
  resultado.classList.remove("oculto");
  btnOtro.classList.remove("oculto");
}

// ===============================
// Iniciar cámara
// ===============================
function iniciarCamara() {
  resultado.classList.add("oculto");
  btnOtro.classList.add("oculto");

  if (qrScanner) {
    qrScanner.clear();
  }

  qrScanner = new Html5Qrcode(readerId);

  qrScanner.start(
    { facingMode: "environment" },
    {
      fps: 12,
      qrbox: { width: 260, height: 260 }
    },
    onScanCorrecto,
    onScanError
  );
}

// ===============================
// Al detectar QR correctamente
// ===============================
async function onScanCorrecto(textoQR) {
  // Detenemos para evitar dobles lecturas
  qrScanner.stop();

  let token = textoQR;

  // Por si en el futuro el QR es URL
  try {
    const url = new URL(textoQR);
    token = url.searchParams.get("token") || textoQR;
  } catch {}

  try {
    const res = await fetch(`/api/barra?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.ok) {
      mostrarResultado("❌ QR no válido o cliente no ingresó", false);
      return;
    }

    mostrarResultado(`
      <div class="perfil">${data.perfil}</div>
      <div class="detalle">
        Descuento aplicado correctamente<br>
        ⭐ Puntos acumulados: <b>${data.puntos}</b>
      </div>
    `, true);

  } catch (err) {
    mostrarResultado("❌ Error de conexión con el servidor", false);
  }
}

// ===============================
// Errores de escaneo (silencioso)
// ===============================
function onScanError() {
  // No hacemos nada, es normal mientras enfoca
}

// ===============================
// Reiniciar lectura
// ===============================
function reiniciar() {
  iniciarCamara();
}

// ===============================
// INIT
// ===============================
iniciarCamara();
