let html5QrCode;
let isScanning = true;

const readerDiv = document.getElementById("reader");
const resultadoCard = document.getElementById("resultado-card");
const nombreCliente = document.getElementById("nombre-cliente");
const puntosTotal = document.getElementById("puntos-total");
const contenidoExito = document.getElementById("contenido-exito");
const contenidoError = document.getElementById("contenido-error");
const errorTxt = document.getElementById("error-txt");

function iniciarScanner() {
    resultadoCard.style.display = "none";
    readerDiv.style.display = "block";
    isScanning = true;

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    ).catch(err => console.error("Error cámara", err));
}

async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    isScanning = false;

    await html5QrCode.stop();
    readerDiv.style.display = "none";
    resultadoCard.style.display = "block";

    try {
        // El servidor espera el token completo (ID|TOKEN) o solo el ID
        // Lo enviamos al endpoint de barra
        const res = await fetch(`/api/barra?token=${encodeURIComponent(decodedText)}`);
        const data = await res.json();

        if (data.ok) {
            // ✅ Mostrar éxito
            contenidoExito.style.display = "block";
            contenidoError.style.display = "none";
            nombreCliente.innerText = data.perfil;
            puntosTotal.innerText = data.puntos;
        } else {
            // ❌ Mostrar error
            contenidoExito.style.display = "none";
            contenidoError.style.display = "block";
            errorTxt.innerText = data.msg || "Error al procesar";
        }
    } catch (err) {
        contenidoExito.style.display = "none";
        contenidoError.style.display = "block";
        errorTxt.innerText = "Error de conexión";
    }
}

function reiniciar() {
    iniciarScanner();
}

// Iniciar al cargar
document.addEventListener("DOMContentLoaded", iniciarScanner);