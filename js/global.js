/*=========================
  GESTIÓN DE FAVORITOS (GLOBAL)
=========================*/

function obtenerFavoritos() {
    try {
        const favs = localStorage.getItem("oriza_favoritos");
        return favs ? JSON.parse(favs) : [];
    } catch (e) {
        console.error("Error al leer favoritos de localStorage:", e);
        return [];
    }
}

function esFavorito(id) {
    const favs = obtenerFavoritos();
    return favs.includes(Number(id)) || favs.includes(String(id));
}

function toggleFavorito(id) {
    let favs = obtenerFavoritos();
    const idNum = Number(id);
    const index = favs.indexOf(idNum);

    if (index >= 0) {
        favs.splice(index, 1); // Quitar de favoritos
    } else {
        favs.push(idNum); // Agregar a favoritos
    }

    try {
        localStorage.setItem("oriza_favoritos", JSON.stringify(favs));
    } catch (e) {
        console.error("Error al guardar favoritos en localStorage:", e);
    }

    return esFavorito(idNum); // Devuelve true si quedó guardado, false si se quitó
}

// ============================================
// FUNCIÓN COMPARTIR (Nativa / Copiar Enlace)
// ============================================

async function compartirProducto(nombre, descripcion, url) {
    const link = url || window.location.href;
    const datosCompartir = {
        title: `${nombre} | ORIZA ART`,
        text: descripcion || `¡Mira esta joya artesanal en ORIZA ART!`,
        url: link
    };

    if (navigator.share) {
        try {
            await navigator.share(datosCompartir);
        } catch (err) {
            console.log("Compartir cancelado o no soportado:", err);
        }
    } else {
        // Respaldo para navegadores de escritorio antiguos
        try {
            await navigator.clipboard.writeText(link);
            alert("¡Enlace del producto copiado al portapapeles! 📋");
        } catch (err) {
            prompt("Copia este enlace para compartir:", link);
        }
    }
}

// 1. Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('✅ Service Worker registrado con éxito:', reg.scope))
            .catch((err) => console.error('❌ Error registrando Service Worker:', err));
    });
}

// 2. Control de instalación desde el botón web
let diferidoPrompt;
const btnInstalar = document.getElementById('btn-instalar');

window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que Android muestre el banner automático por defecto
    e.preventDefault();
    diferidoPrompt = e;

    // Muestra el botón de instalación personalizado
    if (btnInstalar) {
        btnInstalar.style.display = 'inline-block';
    }
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!diferidoPrompt) return;

        // Muestra el cuadro de diálogo de instalación nativo de Android
        diferidoPrompt.prompt();

        const { outcome } = await diferidoPrompt.userChoice;
        console.log(`El usuario tomó la decisión: ${outcome}`);

        // Oculta el botón una vez procesado
        diferidoPrompt = null;
        btnInstalar.style.display = 'none';
    });
}

// Oculta el botón si la app ya fue instalada previamente
window.addEventListener('appinstalled', () => {
    console.log('🎉 ¡App de ORIZA ART instalada correctamente!');
    if (btnInstalar) btnInstalar.style.display = 'none';
});

document.addEventListener("DOMContentLoaded", () => {

    const flotante = document.getElementById("whatsapp-float");

    if (flotante) {
        flotante.addEventListener("click", (e) => {
            e.preventDefault();
            const mensaje = encodeURIComponent(
                "Hola, quiero información sobre las artesanías de ORIZA ART."
            );
            window.open(`https://wa.me/${CONFIG.whatsapp}?text=${mensaje}`, "_blank");
        });
    }

});