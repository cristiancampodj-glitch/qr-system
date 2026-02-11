async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorElement = document.getElementById("error");

  // Limpiar mensajes de error previos
  errorElement.innerText = "";

  if (!email || !password) {
    errorElement.innerText = "⚠️ Por favor, completa todos los campos.";
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.ok) {
      // Guardar información del usuario en el navegador
      localStorage.setItem("user", JSON.stringify(data.user));

      // Lógica de redirección según el rol guardado en la DB
      const rol = data.user.rol.toLowerCase();

      if (rol === "seguridad") {
        window.location.href = "/entrada.html"; // Pantalla del guardia
      } else if (rol === "barra") {
        window.location.href = "/barra.html";   // Pantalla del camarero
      } else if (rol === "admin") {
        window.location.href = "/admin.html";   // Panel de estadísticas
      } else {
        window.location.href = "/pase.html";    // Pase digital del cliente
      }
    } else {
      // Mostrar error enviado por el servidor (ej: "Contraseña incorrecta")
      errorElement.innerText = "❌ " + (data.error || "Error al iniciar sesión");
    }
  } catch (err) {
    console.error("Error en login:", err);
    errorElement.innerText = "❌ Error de conexión con el servidor.";
  }
}

// Permitir el inicio de sesión presionando la tecla 'Enter'
document.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    login();
  }
});