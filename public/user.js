const userId = window.location.pathname.split("/").pop();
const qrCanvas = document.getElementById("qr");
const timerEl = document.getElementById("timer");

let tiempo = 20;

async function generarQR() {
  const res = await fetch(`/api/token/${userId}`);
  const data = await res.json();

  const url = `${window.location.origin}/validar?token=${data.token}`;

  QRCode.toCanvas(qrCanvas, url);
  tiempo = 20;
}

setInterval(() => {
  tiempo--;
  timerEl.textContent = tiempo;
  if (tiempo <= 0) generarQR();
}, 1000);

generarQR();
