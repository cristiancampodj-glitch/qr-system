const form = document.getElementById('registerForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Capturar elementos del DOM
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const tipo = document.getElementById('tipo').value;
    const password = document.getElementById('password').value; 
    const confirmPassword = document.getElementById('confirmPassword').value; // Nueva captura
    
    const docFotoInput = document.getElementById('docFoto');
    const selfieInput = document.getElementById('selfie');
    const passError = document.getElementById('passError'); // Para mostrar error visual

    // 2. Validaciones básicas
    if (!nombre || !email || !tipo || !password) {
        alert("⚠️ Por favor completa todos los campos de texto.");
        return;
    }

    // Validación de coincidencia de contraseñas
    if (password !== confirmPassword) {
        passError.style.display = 'block';
        document.getElementById('confirmPassword').style.borderColor = '#ff6b6b';
        alert("❌ Las contraseñas no coinciden.");
        return;
    } else {
        passError.style.display = 'none';
        document.getElementById('confirmPassword').style.borderColor = '#333';
    }

    if (!docFotoInput.files.length || !selfieInput.files.length) {
        alert("⚠️ Es obligatorio subir la foto del documento y la selfie.");
        return;
    }

    // 3. Preparar FormData (Necesario para enviar archivos/fotos)
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('email', email);
    formData.append('telefono', telefono);
    formData.append('tipo', tipo);
    formData.append('password', password); // Enviamos 'password' tal cual espera el server.js
    
    // Adjuntar archivos reales
    formData.append('docFoto', docFotoInput.files[0]);
    formData.append('selfie', selfieInput.files[0]);

    const btn = document.getElementById('btnSubmit');
    btn.innerText = "⏳ Procesando registro...";
    btn.disabled = true;

    try {
        // 4. Petición al servidor
        const response = await fetch('/api/crear-usuario', {
            method: 'POST',
            body: formData 
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ ¡Registro exitoso!\n\nBienvenido ${nombre}. Ahora puedes iniciar sesión con tu correo y contraseña.`);
            form.reset();
            window.location.href = '/login.html'; 
        } else {
            alert('❌ Error: ' + (result.error || 'No se pudo crear la cuenta.'));
            btn.innerText = "Crear Cuenta";
            btn.disabled = false;
        }

    } catch (err) {
        console.error(err);
        alert('❌ Error de conexión con el servidor.');
        btn.innerText = "Crear Cuenta";
        btn.disabled = false;
    }
});