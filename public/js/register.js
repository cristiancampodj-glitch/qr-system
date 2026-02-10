const form = document.getElementById('registerForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('email').value;
  const telefono = document.getElementById('telefono').value;
  const tipo = document.getElementById('tipo').value;

  // Generar clave de acceso aleatoria
  const clave = Math.random().toString(36).slice(-8); // 8 caracteres alfanuméricos

  const data = { nombre, email, telefono, tipo, clave };

  try {
    const response = await fetch('/api/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if(result.success){
      alert(`Usuario creado con éxito!\nClave: ${clave}`);
      form.reset();
    } else {
      alert('Error al crear usuario');
    }

  } catch(err){
    console.error(err);
    alert('Error de conexión con el servidor');
  }
});
