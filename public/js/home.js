const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  location.href = "/login.html";
}

// Cargar datos reales desde el backend
async function cargarDatos() {
  try {
    const res = await fetch(`/api/clientes/${user.id}`);
    const data = await res.json();

    document.getElementById("nombre").innerText =
      `Hola, ${data.nombre} 👋`;

    document.getElementById("tipo").innerText = data.tipo;
    document.getElementById("puntos").innerText = data.puntos;
    document.getElementById("estado").innerText = "ACTIVO";

    // 👇 AQUÍ VA LA LÍNEA DEL QR
    document.getElementById("qr").src =
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${user.id}`;

  } catch (err) {
    console.error("Error cargando datos", err);
  }
}

cargarDatos();
