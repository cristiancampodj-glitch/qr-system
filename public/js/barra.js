const html5QrCode = new Html5Qrcode("reader");
const readerDiv = document.getElementById("reader");
const resultCard = document.getElementById("resultado-card");
const contentExito = document.getElementById("contenido-exito");
const contentError = document.getElementById("contenido-error");

// Elementos de texto
const nombreTxt = document.getElementById("nombre-cliente");
const puntosTxt = document.getElementById("puntos-total");
const errorTxt = document.getElementById("error-txt");

let isScanning = true;

function iniciarCamara() {
    // Restaurar interfaz para escanear
    resultCard.style.display = "none";
    readerDiv.style.display = "block";
    isScanning = true;

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Error cámara:", err);
        alert("Error al iniciar cámara. Revisa permisos.");
    });
}

async function onScanSuccess(decodedText, decodedResult) {
    if (!isScanning) return;
    isScanning = false;

    // Pausar cámara y mostrar "Procesando..."
    html5QrCode.stop().then(async () => {
        readerDiv.style.display = "none";
        resultCard.style.display = "block";
        
        // Mostrar estado de carga temporalmente (opcional)
        contentExito.style.display = "none";
        contentError.style.display = "none";
        
        try {
            // Enviamos el código escaneado (ID|TOKEN) al servidor
            // El endpoint /api/barra en server.js ya sabe extraer el ID
            const res = await fetch(`/api/barra?token=${encodeURIComponent(decodedText)}`);
            const data = await res.json();

            if (data.ok) {
                // ✅ ÉXITO: Puntos sumados
                contentExito.style.display = "block";
                nombreTxt.innerText = data.perfil;
                puntosTxt.innerText = data.puntos;
            } else {
                // ❌ ERROR
                mostrarError(data.msg || "Usuario no encontrado");
            }

        } catch (error) {
            console.error(error);
            mostrarError("Error de conexión");
        }
    });
}

function mostrarError(msg) {
    contentExito.style.display = "none";
    contentError.style.display = "block";
    errorTxt.innerText = msg;
}

function onScanFailure(error) {
    // Ignoramos fallos de lectura mientras busca QR
}

function reiniciar() {
    iniciarCamara();
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', iniciarCamara);