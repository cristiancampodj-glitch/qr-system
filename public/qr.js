const canvas = document.getElementById("qr");

async function actualizarQR() {
  try {
    const res = await fetch("/api/token");
    const data = await res.json();

    QRCode.toCanvas(canvas, data.token, {
      width: 250
    });
  } catch (error) {
    console.error("Error al generar QR", error);
  }
}

actualizarQR();
setInterval(actualizarQR, 20000);
