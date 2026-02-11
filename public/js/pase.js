// Obtener datos del usuario desde el localStorage
const userData = JSON.parse(localStorage.getItem("user"));

if (!userData || !userData.id) {
    window.location.href = "/login.html";
}

const nombreEl = document.getElementById("nombre");
const tipoEl = document.getElementById("tipo");
const puntosEl = document.getElementById("puntos");
const qrImg = document.getElementById("qr-img");
const timerBar = document.getElementById("timer-bar");
const userPhoto = document.getElementById("user-photo");

async function cargarPerfil() {
    try {
        const res = await fetch(`/api/cliente/${userData.id}`);
        const data = await res.json();
        
        if (data) {
            nombreEl.innerText = data.nombre;
            tipoEl.innerText = data.tipo;
            puntosEl.innerText = data.puntos;
            // Si el usuario tiene foto en la DB, la mostramos
            if(data.selfie_foto) userPhoto.src = data.selfie_foto;
        }
    } catch (e) {
        console.error("Error cargando perfil", e);
    }
}

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

function animarBarra() {
    timerBar.style.transition = "none";
    timerBar.style.width = "100%";
    timerBar.offsetWidth; // Reflow
    timerBar.style.transition = "width 15s linear";
    timerBar.style.width = "0%";
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// Iniciar
cargarPerfil();
refrescarQR();
setInterval(refrescarQR, 15000);