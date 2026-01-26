const form = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensaje.innerText = "Registrando...";
  mensaje.className = "msg";

  const nombre = document.getElementById("nombre").value.trim();
  const documento = document.getElementById("documento").value.trim();
  const tipo = document.getElementById("tipo").value;

  try {
    const res = await fetch("/api/registrar-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, documento, tipo })
    });

    const data = await res.json();

    if (data.ok) {
      mensaje.innerText = "✅ Cliente registrado correctamente";
      mensaje.className = "msg ok";
      form.reset();
    } else {
      mensaje.innerText = "❌ " + data.error;
      mensaje.className = "msg error";
    }

  } catch (err) {
    mensaje.innerText = "❌ Error de conexión con el servidor";
    mensaje.className = "msg error";
  }
});
