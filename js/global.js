
// ============================================
// GESTIÓN DE FAVORITOS (localStorage)
// ============================================

function obtenerFavoritos() {
    return JSON.parse(localStorage.getItem("oriza_favoritos")) || [];
}

function esFavorito(id) {
    const favs = obtenerFavoritos();
    return favs.includes(Number(id)) || favs.includes(String(id));
}

function toggleFavorito(id) {
    let favs = obtenerFavoritos();
    const idNum = Number(id);
    
    if (favs.includes(idNum) || favs.includes(String(id))) {
        favs = favs.filter(f => Number(f) !== idNum && String(f) !== String(id));
    } else {
        favs.push(idNum);
    }
    
    localStorage.setItem("oriza_favoritos", JSON.stringify(favs));
    return favs.includes(idNum);
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
