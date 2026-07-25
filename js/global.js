// ===============================
// GLOBAL — se carga en todas las páginas
// Botón flotante de WhatsApp
// ===============================

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
