// ===============================
// CONFIGURACIÓN Y VARIABLES
// ===============================
let html5QrCode; // Definimos la variable fuera para poder reutilizarla
let isScanning = false;

// Elementos del DOM
const readerDiv = document.getElementById("reader");
const resultadoCard = document.getElementById("resultado-card");
const estadoMsg = document.getElementById("estado-msg");
const fotoImg = document.getElementById("foto-img");
const nombreTxt = document.getElementById("nombre-txt");
const rolTxt = document.getElementById("rol-txt");

// ===============================
// 1. INICIAR CÁMARA
// ===============================
function iniciarCamara() {
    resultadoCard.style.display = "none";
    readerDiv.style.display = "block";
    isScanning = true;

    // Si no existe la instancia, la creamos
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanFailure
    ).catch(err => {
        console.error("Error al iniciar cámara:", err);
        alert("⚠️ Verifica que has dado permisos de cámara a app.euontech.es");
    });
}

// ===============================
// 2. CUANDO DETECTA UN QR
// ===============================
async function onScanSuccess(decodedText) {
    if (!isScanning) return; 
    isScanning = false; 

    try {
        // Detenemos la cámara antes de procesar para mejorar rendimiento en móviles
        await html5QrCode.stop();
        
        readerDiv.style.display = "none";
        resultadoCard.style.display = "block";
        
        estadoMsg.innerText = "⏳ Verificando en base de datos...";
        estadoMsg.className = "estado";
        fotoImg.src = "/assets/logo.jpeg"; 

        // 3. ENVIAR AL SERVIDOR (Validación TOTP 15s)
        const res = await fetch(`/api/entrada?codigo=${encodeURIComponent(decodedText)}`);
        const data = await res.json();

        // 4. MOSTRAR RESULTADO
        if (data.ok) {
            // ✅ ACCESO PERMITIDO (Token válido y ID existe)
            estadoMsg.innerText = "✅ ACCESO PERMITIDO";
            estadoMsg.className = "estado valido";
            
            nombreTxt.innerText = data.nombre;
            rolTxt.innerText = data.tipo || "CLIENTE";
            
            // Usamos la foto del servidor o placeholder
            fotoImg.src = data.foto || "https://via.placeholder.com/150?text=Sin+Foto";

        } else {
            // ❌ ERROR (Token caducado, QR manipulado o usuario inexistente)
            mostrarError(data.msg || "QR INVÁLIDO");
        }

    } catch (error) {
        console.error("Error en proceso de escaneo:", error);
        mostrarError("ERROR DE CONEXIÓN");
    }
}

// ===============================
// 3. MANEJO DE ERRORES
// ===============================
function onScanFailure(error) {
    // Silencioso: Fallos de lectura normales mientras busca el QR
}

function mostrarError(mensaje) {
    estadoMsg.innerText = "⛔ " + mensaje;
    estadoMsg.className = "estado invalido";
    nombreTxt.innerText = "---";
    rolTxt.innerText = "---";
    fotoImg.src = "https://via.placeholder.com/150/ff0000/ffffff?text=X";
}

// ===============================
// 4. REINICIAR
// ===============================
function reiniciar() {
    iniciarCamara();
}

// Iniciar automáticamente al cargar la web
document.addEventListener('DOMContentLoaded', iniciarCamara);