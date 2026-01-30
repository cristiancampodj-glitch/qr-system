const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  location.href = "/login.html";
}

// Texto
document.getElementById("nombre").innerText = `Hola, ${user.nombre} 👋`;
document.getElementById("tipo").innerText = user.rol.toUpperCase();
document.getElementById("puntos").innerText = user.puntos;

// QR dinámico
document.getElementById("qr").src =
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${user.id}`;
