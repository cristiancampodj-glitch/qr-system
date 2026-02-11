// Verificamos si hay usuario en el navegador
const user = JSON.parse(localStorage.getItem("user"));

if (!user || !user.id) {
    window.location.href = "/login.html";
}

// Elementos del DOM
const nombreEl = document.getElementById("nombre");
const tipoEl = document.getElementById("tipo");
const puntosEl = document.getElementById("puntos");
const qrImg = document.getElementById("qr-img");
const timerBar = document.getElementById("timer-bar");

// --- 1. CARGAR DATOS DEL PERFIL (PUNTOS, ROL) ---
async function cargarPerfil() {
    try {
        const res = await fetch(`/api/cliente/${user.id}`);
        const data = await res.json();
        
        if (data) {
            nombreEl.innerText = data.nombre;
            tipoEl.innerText = data.tipo.toUpperCase();
            puntosEl.innerText = data.puntos;
        }
    } catch (error) {
        console.error("Error cargando perfil:", error);
    }
}

// --- 2. CARGAR QR DINÁMICO (CADA 15s) ---
async function actualizarQR() {
    try {
        // Pedimos la imagen al servidor
        const res = await fetch(`/api/qr/live/${user.id}`);
        const data = await res.json();

        if (data.qrImage) {
            qrImg.src = data.qrImage;
            
            // Reiniciar animación de la barra
            resetTimerAnimation();
        }
    } catch (error) {
        console.error("Error cargando QR:", error);
    }
}

// Función visual para la barra de tiempo
function resetTimerAnimation() {
    // Quitamos la transición para resetear a ancho completo instantáneamente
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';

    // Forzamos un "reflow" para que el navegador se de cuenta del cambio
    void timerBar.offsetWidth;

    // Iniciamos la animación de vaciado (dura 15 segundos)
    timerBar.style.transition = 'width 15s linear';
    timerBar.style.width = '0%';
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// --- INICIO ---
cargarPerfil();   // Carga datos fijos una vez
actualizarQR();   // Carga el primer QR

// Programar actualización cada 15 segundos
setInterval(actualizarQR, 15000);