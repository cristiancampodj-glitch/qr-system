async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  error.innerText = "";

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!data.ok) {
    error.innerText = data.error || "Error de acceso";
    return;
  }

  localStorage.setItem("user", JSON.stringify(data.user));

  if (data.user.rol === "staff") {
    window.location.href = "/panel.html";
  } else {
    window.location.href = "/home.html";
  }
}
