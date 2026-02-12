// ===============================
// CONFIGURACIÓN Y VARIABLES
// ===============================
let html5QrCode;
let isScanning = false;
let currentUserId = null; 

// Elementos del DOM
const readerDiv = document.getElementById("reader");
const resultadoCard = document.getElementById("resultado-card");
const estadoMsg = document.getElementById("estado-msg");
const fotoImg = document.getElementById("foto-img");
const nombreTxt = document.getElementById("nombre-txt");
const rolTxt = document.getElementById("rol-txt");

// Botones de acción
const btnOk = document.getElementById("btn-ok");
const btnVeto = document.getElementById("btn-veto");
const btnRetry = document.getElementById("btn-retry");

// ===============================
// 1. INICIAR CÁMARA
// ===============================
function iniciarCamara() {
    resultadoCard.style.display = "none";
    readerDiv.style.display = "block";
    isScanning = true;
    currentUserId = null; 

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
        alert("⚠️ Verifica los permisos de cámara.");
    });
}

// ===============================
// 2. CUANDO DETECTA UN QR
// ===============================
async function onScanSuccess(decodedText) {
    if (!isScanning) return; 
    isScanning = false; 

    try {
        await html5QrCode.stop();
        
        readerDiv.style.display = "none";
        resultadoCard.style.display = "block";
        
        btnOk.style.display = "none";
        btnVeto.style.display = "none";
        btnRetry.style.display = "none";

        estadoMsg.innerText = "⏳ Verificando...";
        estadoMsg.className = "estado";

        const res = await fetch(`/api/entrada?codigo=${encodeURIComponent(decodedText)}`);
        const data = await res.json();

        currentUserId = data.id;

        if (data.ok) {
            estadoMsg.innerText = "✅ ACCESO PERMITIDO";
            estadoMsg.className = "estado valido";
            nombreTxt.innerText = data.nombre;
            rolTxt.innerText = data.tipo || "CLIENTE";
            fotoImg.src = data.foto || "/assets/logo.jpeg";

            btnOk.style.display = "block";
            btnVeto.style.display = "block";

        } else {
            mostrarError(data.msg || "QR INVÁLIDO");
            btnRetry.style.display = "block";
            
            if(currentUserId) btnVeto.style.display = "block";
        }

    } catch (error) {
        console.error("Error:", error);
        mostrarError("ERROR DE CONEXIÓN");
        btnRetry.style.display = "block";
    }
}

// ===============================
// 3. FUNCIÓN PARA VETAR USUARIO (CON MOTIVO)
// ===============================
async function vetarUsuario() {
    if (!currentUserId) return;
    
    // 🛡️ Solicitar motivo del veto
    const motivo = prompt("✍️ Motivo del veto (ej: Pelea, Alcohol, Comportamiento):");
    
    // Si el usuario cancela el prompt (null), no hacemos nada
    if (motivo === null) return;

    // Confirmación final con el motivo incluido
    const confirmacion = confirm(`⚠️ ¿VETAR A ESTE CLIENTE POR: "${motivo || 'Sin especificar'}"?`);
    
    if (confirmacion) {
        try {
            const res = await fetch('/api/seguridad/vetar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: currentUserId,
                    motivo: motivo || "Sin motivo especificado" 
                })
            });
            const data = await res.json();
            
            if (data.ok) {
                alert("🚫 Usuario añadido a la lista negra con el motivo registrado.");
                reiniciar();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("No se pudo conectar con el servidor.");
        }
    }
}

// ===============================
// 4. UTILIDADES
// ===============================
function onScanFailure(error) { /* Silencioso */ }

function mostrarError(mensaje) {
    estadoMsg.innerText = "⛔ " + mensaje;
    estadoMsg.className = "estado invalido";
    nombreTxt.innerText = "BLOQUEADO";
    rolTxt.innerText = "NO AUTORIZADO";
    fotoImg.src = "https://via.placeholder.com/150/ff0000/ffffff?text=X";
}

function reiniciar() {
    iniciarCamara();
}

document.addEventListener('DOMContentLoaded', iniciarCamara);