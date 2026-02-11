// ===============================
// CONFIGURACIÓN Y VARIABLES
// ===============================
const html5QrCode = new Html5Qrcode("reader");
let isScanning = false;

// Elementos del DOM (Deben coincidir con tu HTML)
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
    // Interfaz: Mostrar cámara, ocultar tarjeta
    resultadoCard.style.display = "none";
    readerDiv.style.display = "block";
    isScanning = true;

    // Configuración del escáner
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    };

    // Arrancamos la cámara trasera ("environment")
    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanFailure
    ).catch(err => {
        console.error("Error al iniciar cámara:", err);
        alert("⚠️ No se puede acceder a la cámara. Verifica los permisos.");
    });
}

// ===============================
// 2. CUANDO DETECTA UN QR
// ===============================
function onScanSuccess(decodedText, decodedResult) {
    if (!isScanning) return; 
    isScanning = false; // Evitamos lecturas múltiples

    // 1. Detenemos la cámara momentáneamente
    html5QrCode.stop().then(async () => {
        
        // 2. Interfaz: Ocultar cámara, mostrar "Cargando..."
        readerDiv.style.display = "none";
        resultadoCard.style.display = "block";
        
        estadoMsg.innerText = "⏳ Verificando...";
        estadoMsg.className = "estado";
        fotoImg.src = "assets/logo.jpeg"; // Imagen temporal mientras carga
        nombreTxt.innerText = "---";
        rolTxt.innerText = "---";

        try {
            // 3. ENVIAR AL SERVIDOR
            // El servidor espera ?codigo=ID|TOKEN
            const res = await fetch(`/api/entrada?codigo=${encodeURIComponent(decodedText)}`);
            const data = await res.json();

            // 4. MOSTRAR RESULTADO
            if (data.ok) {
                // ✅ ÉXITO
                estadoMsg.innerText = "✅ ACCESO PERMITIDO";
                estadoMsg.className = "estado valido";
                
                nombreTxt.innerText = data.nombre;
                rolTxt.innerText = data.tipo || "CLIENTE";
                
                // Mostrar foto real del usuario (o placeholder si no tiene)
                fotoImg.src = data.foto || "https://via.placeholder.com/150?text=Sin+Foto";

                // Opcional: Sonido de éxito
                // new Audio('/assets/success.mp3').play().catch(e => {}); 

            } else {
                // ❌ ERROR (QR Caducado, falso, etc.)
                mostrarError(data.msg || "QR INVÁLIDO");
            }

        } catch (error) {
            console.error("Error de red:", error);
            mostrarError("ERROR DE CONEXIÓN");
        }
    }).catch(err => {
        console.error("Error al detener cámara:", err);
    });
}

// ===============================
// 3. MANEJO DE ERRORES
// ===============================
function onScanFailure(error) {
    // Es normal que falle mientras busca un QR, no hacemos nada.
}

function mostrarError(mensaje) {
    estadoMsg.innerText = "⛔ " + mensaje;
    estadoMsg.className = "estado invalido";
    nombreTxt.innerText = "Desconocido";
    rolTxt.innerText = "---";
    fotoImg.src = "https://via.placeholder.com/150/ff0000/ffffff?text=X";
    
    // Opcional: Sonido de error
    // new Audio('/assets/error.mp3').play().catch(e => {});
}

// ===============================
// 4. REINICIAR (Botón "Siguiente")
// ===============================
function reiniciar() {
    iniciarCamara();
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', iniciarCamara);