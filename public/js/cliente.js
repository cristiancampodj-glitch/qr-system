// ===============================
// CLIENTE.JS
// Lógica del QR del cliente
// ===============================

// Obtener ID del cliente desde la URL
// Ejemplo: cliente.html?id=cli_123456
const params = new URLSearchParams(window.location.search);
const clienteId = params.get("id");

if (!clienteId) {
  alert("Acceso inválido: falta ID de cliente");
}

// Elementos del DOM
const nombreEl = document.getElementById("nombre");
const perfilEl = document.getElementById("perfil");
const qrDiv = document.getElementById("qr");

// ===============================
// Cargar datos del cliente
// ===============================
async function cargarCliente() {
  try {
    const res = await fetch(`/api/cliente/${clienteId}`);
    const data = await res.json();

    if (!data) {
      alert("Cliente no encontrado");
      return;
    }

    nombreEl.textContent = data.nombre;
    perfilEl.textContent = data.perfil;

  } catch (err) {
    alert("Error cargando datos del cliente");
  }
}

// ===============================
// Generar QR dinámico
// ===============================
async function generarQR() {
  try {
    const res = await fetch(`/api/token/${clienteId}`);
    const data = await res.json();

    if (!data.token) {
      return;
    }

    // Limpiar QR anterior
    qrDiv.innerHTML = "";

    // IMPORTANTE:
    // El QR contiene SOLO el token
    // Seguridad y barra lo validan
    new QRCode(qrDiv, {
      text: data.token,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

  } catch (err) {
    console.error("Error generando QR", err);
  }
}

// ===============================
// INIT
// ===============================
cargarCliente();
generarQR();

// Rotar QR cada 20 segundos (backend también expira en 20s)
setInterval(generarQR, 20000);
