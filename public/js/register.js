document.getElementById("registerForm").addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    nombre: nombre.value,
    email: email.value,
    telefono: telefono.value,
    tipo: tipo.value
  };

  const res = await fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const r = await res.json();

  if (r.ok) {
    alert("Registro completado");
  } else {
    alert("Error en el registro");
  }
});
