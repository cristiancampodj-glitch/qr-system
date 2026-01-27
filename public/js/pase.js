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
