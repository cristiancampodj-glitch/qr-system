const form = document.getElementById('registerForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Obtenemos los valores y quitamos espacios en blanco al inicio/final
  const nombre = document.getElementById('nombre').value.trim();
  const email = document.getElementById('email').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const tipo = document.getElementById('tipo').value; // Asegúrate que en HTML los values sean: 'admin', 'seguridad', 'barra', 'cliente'

  // Validaciones básicas
  if (!nombre || !email || !tipo) {
    alert("Por favor completa los campos obligatorios.");
    return;
  }

  // Generar clave de acceso aleatoria (para que el usuario pueda entrar)
  const clave = Math.random().toString(36).slice(-8); // 8 caracteres alfanuméricos

  const data = { nombre, email, telefono, tipo, clave };

  try {
    // Esta es la URL correcta que conecta con el server.js nuevo
    const response = await fetch('/api/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      // IMPORTANTE: Mostramos la clave al admin para que se la dé al usuario
      alert(`✅ Usuario creado con éxito!\n\nEsta es su contraseña temporal:\n👉 ${clave}\n\nGuárdala o compártela con el usuario.`);
      form.reset();
    } else {
      alert('❌ Error al crear usuario: ' + (result.error || 'Intenta de nuevo.'));
    }

  } catch (err) {
    console.error(err);
    alert('❌ Error de conexión con el servidor.');
  }
});