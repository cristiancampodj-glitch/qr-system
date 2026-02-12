// Obtener datos del usuario desde el localStorage
const userData = JSON.parse(localStorage.getItem("user"));

// Redirigir al login si no hay sesión activa
if (!userData || !userData.id) {
    window.location.href = "/login.html";
}

// Referencias a los nuevos IDs del HTML transformado
const nombreEl = document.getElementById("nombre");
const tipoEl = document.getElementById("tipo");
const puntosValOculto = document.getElementById("puntos_val"); // Referencia al span oculto para lógica interna
const qrImg = document.getElementById("qr-img");
const timerBar = document.getElementById("timer-bar");
const userPhoto = document.getElementById("user-photo");

/**
 * Carga los datos del perfil del usuario desde la API
 */
async function cargarPerfil() {
    try {
        const res = await fetch(`/api/cliente/${userData.id}`);
        const data = await res.json();
        
        if (data) {
            nombreEl.innerText = data.nombre;
            tipoEl.innerText = data.tipo || "CLIENTE";
            puntosValOculto.innerText = data.puntos; // Guardamos el valor para el alert de puntos
            
            // Si el usuario tiene foto registrada en la DB, actualizamos el avatar con glow
            if(data.selfie_foto) {
                userPhoto.src = data.selfie_foto;
            }
        }
    } catch (e) {
        console.error("Error cargando perfil", e);
    }
}

/**
 * Obtiene un nuevo QR dinámico generado por el servidor (válido por 15s)
 */
async function refrescarQR() {
    try {
        const res = await fetch(`/api/qr/live/${userData.id}`);
        const data = await res.json();

        if (data.qrImage) {
            qrImg.src = data.qrImage;
            animarBarra();
        }
    } catch (e) {
        console.error("Error refrescando QR", e);
    }
}

/**
 * Controla la animación visual de la barra de progreso de 15 segundos
 */
function animarBarra() {
    // Reiniciamos la barra instantáneamente
    timerBar.style.transition = "none";
    timerBar.style.width = "100%";
    
    // Forzamos un reflow para que el navegador detecte el cambio de estado
    timerBar.offsetWidth; 
    
    // Iniciamos la cuenta regresiva lineal de 15 segundos
    timerBar.style.transition = "width 15s linear";
    timerBar.style.width = "0%";
}

/**
 * Limpia la sesión y redirige al inicio
 */
function logout() {
    if(confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        localStorage.removeItem("user");
        window.location.href = "/login.html";
    }
}

// --- INICIALIZACIÓN ---
// Cargar datos estáticos y primer QR al entrar
cargarPerfil();
refrescarQR();

// Configurar el ciclo de actualización cada 15 segundos (15000ms)
setInterval(refrescarQR, 15000);