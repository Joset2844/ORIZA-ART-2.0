// ===============================
// ORIZA ART 2.0
// script.js
// ===============================

// Botón principal de WhatsApp
const btnWhatsapp = document.getElementById("whatsapp");

if (btnWhatsapp) {
  btnWhatsapp.addEventListener("click", function(e) {
    
    e.preventDefault();
    
    const mensaje = encodeURIComponent(
      "¡Hola! 👋 Me gustaría recibir información sobre las artesanías de ORIZA ART."
    );
    
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${mensaje}`);
  });
}

// Animación de aparición al hacer scroll (reutilizable para elementos
// que ya existen y para los que se insertan después, como el catálogo)
const observador = new IntersectionObserver((entradas) => {
  
  entradas.forEach(entrada => {
    
    if (entrada.isIntersecting) {
      
      entrada.target.style.opacity = "1";
      entrada.target.style.transform = "translateY(0)";
      
    }
    
  });
  
}, {
  threshold: 0.15
});

function animarEntrada(elemento) {

  elemento.style.opacity = "0";
  elemento.style.transform = "translateY(40px)";
  elemento.style.transition = "all .8s ease";

  observador.observe(elemento);

}

document.querySelectorAll(".hero-text, .hero-img, .nosotros")
  .forEach(animarEntrada);

console.log("🌿 ORIZA ART 2.0 cargado correctamente");

/*=========================
  GALERÍA DINÁMICA (inicio)
  Franja de solo imágenes, en orden aleatorio en cada carga,
  para incentivar a entrar a catalogo.html y ver el detalle.
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

  const productos = await cargarProductos();

  const disponibles = productos.filter(producto => producto.disponible !== false);
  let seleccion = mezclar(disponibles.length ? disponibles : productos);

  // aseguramos suficientes imágenes para que la franja se vea llena y fluya bien
  while (seleccion.length && seleccion.length < 6) {
    seleccion = seleccion.concat(mezclar(seleccion));
  }

  const tarjetas = seleccion.map(producto => `
    <a href="producto.html?id=${producto.id}" class="galeria-item">
      <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">
    </a>
  `).join("");

  // se repite una vez para que el desplazamiento sea infinito y sin corte
  catalogo.innerHTML = tarjetas + tarjetas;

}

iniciarCatalogoInicio();