// 1. Verificación de Seguridad: Solo entra si el rol es admin
const userData = JSON.parse(localStorage.getItem("user"));
if (!userData || userData.rol !== 'admin') {
    window.location.href = "/login.html";
}

// 2. Cargar Estadísticas y Ranking de Clientes
async function cargarStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();

        document.getElementById('total-users').innerText = data.usuarios;
        document.getElementById('total-entradas').innerText = data.entradas;
        document.getElementById('total-consumos').innerText = data.consumos;

        const list = document.getElementById('top-list');
        list.innerHTML = '';
        data.top.forEach((cliente, index) => {
            list.innerHTML += `
            <li>
              <div>
                <span class="rank">#${index + 1}</span>
                <span>${cliente.nombre}</span>
              </div>
              <span class="puntos">${cliente.puntos} PTS</span>
            </li>`;
        });
    } catch (err) {
        console.error("Error al cargar estadísticas:", err);
    }
}

// 3. Cargar Usuarios Vetados con sus Motivos
async function cargarBlacklist() {
    try {
        const res = await fetch('/api/admin/blacklist');
        const usuarios = await res.json();
        const list = document.getElementById('blacklist-list');
        
        if (usuarios.length === 0) {
            list.innerHTML = '<li style="border-left-color: #444; color: #666;">No hay usuarios vetados actualmente.</li>';
            return;
        }

        list.innerHTML = '';
        usuarios.forEach(u => {
            list.innerHTML += `
            <li class="li-blacklist">
              <div>
                <span style="display:block; font-weight:bold;">${u.nombre}</span>
                <small style="color:#888;">${u.email}</small>
                <span class="motivo-tag">⚠️ Motivo: ${u.motivo_veto || 'No especificado'}</span>
              </div>
              <button class="btn-perdonar" onclick="quitarVeto(${u.id})">QUITAR VETO</button>
            </li>`;
        });
    } catch (err) {
        console.error("Error al cargar lista negra:", err);
    }
}

// 4. Acción de Indulto: Restaurar el acceso al usuario
async function quitarVeto(id) {
    if (!confirm("¿Deseas restaurar el acceso a este usuario?")) return;

    try {
        const res = await fetch('/api/admin/quitar-veto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            alert("Acceso restaurado con éxito.");
            updateAll();
        }
    } catch (e) {
        alert("Error al conectar con el servidor.");
    }
}

// 5. Función de Salida
function logout() {
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// 6. Ciclo de actualización automática
function updateAll() {
    cargarStats();
    cargarBlacklist();
}

// Ejecución inicial
document.addEventListener('DOMContentLoaded', updateAll);

// Refrescar datos cada 30 segundos
setInterval(updateAll, 30000);