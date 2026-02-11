/**
 * Lógica de Autenticación para Paröle
 */

async function login() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorElement = document.getElementById("error");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Limpiar mensajes de error previos
    errorElement.innerText = "";

    // Validación básica en el cliente
    if (!email || !password) {
        errorElement.innerText = "⚠️ Por favor, completa todos los campos.";
        return;
    }

    try {
        // Petición al endpoint configurado en server.js
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.ok) {
            // Guardar información del usuario en localStorage para persistencia de sesión
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirección inteligente según el ROL devuelto por la BD
            const rol = data.user.rol.toLowerCase();

            switch (rol) {
                case "seguridad":
                    window.location.href = "/entrada.html";
                    break;
                case "barra":
                    window.location.href = "/barra.html";
                    break;
                case "admin":
                    window.location.href = "/admin.html";
                    break;
                default:
                    // Clientes, Universitarios, VIPs, etc.
                    window.location.href = "/pase.html";
                    break;
            }
        } else {
            // Error controlado (Usuario no existe o contraseña mal)
            errorElement.innerText = "❌ " + (data.error || "Error al iniciar sesión");
        }
    } catch (err) {
        console.error("Error en login:", err);
        errorElement.innerText = "❌ No se pudo conectar con el servidor.";
    }
}

/**
 * Función para alternar la visibilidad de la contraseña
 * Sincronizada con el botón del ojito en login.html
 */
function togglePass() {
    const passInput = document.getElementById("password");
    if (passInput.type === "password") {
        passInput.type = "text";
    } else {
        passInput.type = "password";
    }
}

// Escuchar la tecla Enter para facilitar el acceso
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        login();
    }
});