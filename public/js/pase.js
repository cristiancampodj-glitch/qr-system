const params = new URLSearchParams(location.search);
const clienteId = params.get("id");

async function cargarCliente() {
  const res = await fetch(`/api/cliente/${clienteId}`);
  const data = await res.json();

  nombre.innerText = data.nombre;
  tipo.innerText = data.tipo;
  puntos.innerText = data.puntos;
}

async function generarQR() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  const res = await fetch(`/api/qr/generar/${clienteId}`, {
    method: "POST"
  });

  const data = await res.json();

  qr.innerHTML = "";
  new QRCode(qr, {
    text: data.qrUrl,
    width: 180,
    height: 180,
    colorDark: "#fff",
    colorLight: "#000"
  });

  setTimeout(() => {
    qr.innerHTML = "⏳ QR expirado";
  }, 60000);
}

cargarCliente();