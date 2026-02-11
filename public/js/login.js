async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  // Limpiamos errores previos
  error.innerText = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.ok) {
      error.innerText = data.error || "Error de acceso (usuario o clave incorrectos)";
      return;
    }

    // Guardamos los datos del usuario para usarlos en las otras páginas
    localStorage.setItem("user", JSON.stringify(data.user));

    // --- LÓGICA DE REDIRECCIÓN (CORREGIDA) ---
    const rol = data.user.rol;

    if (rol === "admin") {
      window.location.href = "/admin.html";      // Panel Admin
    } else if (rol === "seguridad") {
      window.location.href = "/entrada.html";    // Escáner Seguridad
    } else if (rol === "barra") {
      window.location.href = "/barra.html";      // Escáner Barra
    } else {
      // Clientes y VIPs van a su pase
      window.location.href = "/pase.html"; 
    }

  } catch (err) {
    console.error(err);
    error.innerText = "Error de conexión con el servidor.";
  }
}

// Opcional: Permitir entrar pulsando "Enter"
document.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    login();
  }
});