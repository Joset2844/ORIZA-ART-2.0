// ===============================
// ORIZA ART 2.0
// main.js
// ===============================

// Botón principal de WhatsApp
const btnWhatsapp = document.getElementById("whatsapp");

if (btnWhatsapp) {
  btnWhatsapp.addEventListener("click", function(e) {
    e.preventDefault();
    const whatsappNum = (typeof CONFIG !== "undefined" && CONFIG.whatsapp) ? CONFIG.whatsapp : "";
    const mensaje = encodeURIComponent(
      "¡Hola! Me gustaría recibir información sobre las artesanías de ORIZA ART."
    );
    window.open(`https://wa.me/${whatsappNum}?text=${mensaje}`, "_blank");
  });
}

// Animación de aparición con IntersectionObserver
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      entrada.target.style.opacity = "1";
      entrada.target.style.transform = "translateY(0)";
      observador.unobserve(entrada.target); // Dejar de observar una vez animado
    }
  });
}, {
  threshold: 0.15
});

function animarEntrada(elemento) {
  if (!elemento) return;
  elemento.style.opacity = "0";
  elemento.style.transform = "translateY(40px)";
  elemento.style.transition = "all .8s ease";
  observador.observe(elemento);
}

document.querySelectorAll(".hero-text, .hero-img, .nosotros")
  .forEach(animarEntrada);

/*=========================
  GALERÍA DINÁMICA (inicio)
==========================*/

const catalogo = document.getElementById("catalogo");

function mezclar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function iniciarCatalogoInicio() {
  if (!catalogo) return;

  if (typeof cargarProductos !== "function") return;

  try {
    const productos = await cargarProductos();
    const disponibles = productos.filter(producto => !producto.agotado);
    let seleccion = mezclar(disponibles.length ? disponibles : productos);

    while (seleccion.length && seleccion.length < 6) {
      seleccion = seleccion.concat(mezclar(seleccion));
    }

    const tarjetas = seleccion.map(producto => `
      <a href="producto.html?id=${producto.id}" class="galeria-item">
        <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy" width="200" height="200">
      </a>
    `).join("");

    catalogo.innerHTML = tarjetas + tarjetas;
  } catch (error) {
    console.error("Error al cargar la galería inicial:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarCatalogoInicio();
});