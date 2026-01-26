const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const box = document.getElementById("resultado");

if (!token) {
  box.className = "box fail";
  box.innerHTML = "<h1>❌ ERROR</h1><p>Token inexistente</p>";
} else {
  fetch(`/api/validar?token=${token}`)
    .then(res => res.json())
    .then(data => {
      if (data.valido) {
        box.className = "box ok";
        box.innerHTML = `
          <h1>✅ ACCESO OK</h1>
          <p>Tipo: ${data.tipo}</p>
          <p>Descuento: ${data.descuento}</p>
        `;
      } else {
        box.className = "box fail";
        box.innerHTML = `
          <h1>❌ DENEGADO</h1>
          <p>${data.motivo}</p>
        `;
      }
    })
    .catch(() => {
      box.className = "box fail";
      box.innerHTML = "<h1>❌ ERROR</h1><p>Servidor no disponible</p>";
    });
}
