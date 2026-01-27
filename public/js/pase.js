const token = window.location.pathname.split("/").pop();

fetch(`/api/pase/${token}`)
  .then(res => res.json())
  .then(data => {
    document.getElementById("nombre").innerText = data.nombre;
    document.getElementById("tipo").innerText = "Tipo: " + data.tipo;
    document.getElementById("puntos").innerText = "Puntos: " + data.puntos;
  })
  .catch(() => {
    document.body.innerHTML = "<h2>Pase no válido</h2>";
  });
const token = window.location.pathname.split("/").pop();

fetch(`/api/pase/${token}`)
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      document.body.innerHTML = "<h2>Pase no válido</h2>";
      return;
    }

    document.getElementById("nombre").textContent = data.nombre;
    document.getElementById("tipo").textContent = data.tipo;
    document.getElementById("puntos").textContent = data.puntos;

    document.getElementById("qr").src =
      "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
      encodeURIComponent(token);
  })
  .catch(() => {
    document.body.innerHTML = "<h2>Error de conexión</h2>";
  });
