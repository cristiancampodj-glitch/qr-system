// ===============================
// validar-entrada.js
// Módulo de SEGURIDAD
// ===============================

const readerId = "reader";
const resultado = document.getElementById("resultado");
const btnOtro = document.getElementById("btnOtro");

let qrScanner = null;

// ===============================
// Mostrar resultado visual
// ===============================
function mostrarResultado(texto, ok = true) {
  resultado.innerHTML = texto;
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
// QR detectado correctamente
// ===============================
async function onScanCorrecto(textoQR) {
  // Detenemos lectura para evitar dobles validaciones
  qrScanner.stop();

  let token = textoQR;

  // Si el QR es URL, extraemos token
  try {
    const url = new URL(textoQR);
    token = url.searchParams.get("token") || textoQR;
  } catch {}

  try {
    const res = await fetch(`/api/entrada?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.ok) {
      mostrarResultado("❌ ACCESO DENEGADO", false);
      return;
    }

    mostrarResultado("✅ ENTRADA PERMITIDA", true);

  } catch (err) {
    mostrarResultado("❌ ERROR DE SISTEMA", false);
  }
}

// ===============================
// Errores de escaneo (ignorar)
// ===============================
function onScanError() {
  // Es normal mientras la cámara enfoca
}

// ===============================
// Reiniciar validación
// ===============================
function reiniciar() {
  iniciarCamara();
}

// ===============================
// INIT
// ===============================
iniciarCamara();
