const form = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  mensaje.textContent = "";
  mensaje.className = "msg";

  const nombre = document.getElementById("nombre").value.trim();
  const documento = document.getElementById("documento").value.trim();
  const tipo = document.getElementById("tipo").value;

  if (!nombre || !documento || !tipo) {
    mensaje.textContent = "Completa todos los campos";
    mensaje.classList.add("error");
    return;
  }

  try {
    const res = await fetch("/api/registrar-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        documento,
        tipo
      })
    });

    const data = await res.json();

    if (data.ok) {
      mensaje.textContent = "✅ Cliente registrado correctamente";
      mensaje.classList.add("ok");

      // Redirige al perfil del cliente (QR)
      setTimeout(() => {
        window.location.href = `/cliente.html?id=${documento}`;
      }, 1200);

    } else {
      mensaje.textContent = data.error || "Error al registrar cliente";
      mensaje.classList.add("error");
    }

  } catch (err) {
    mensaje.textContent = "❌ Error de conexión con el servidor";
    mensaje.classList.add("error");
  }
});
