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

// Animación de aparición al hacer scroll
const elementos = document.querySelectorAll(".producto, .hero-text, .hero-img, .nosotros");

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

elementos.forEach(elemento => {
  
  elemento.style.opacity = "0";
  elemento.style.transform = "translateY(40px)";
  elemento.style.transition = "all .8s ease";
  
  observador.observe(elemento);
  
});

console.log("🌿 ORIZA ART 2.0 cargado correctamente");

// Botón flotante

const flotante = document.getElementById("whatsapp-float");

if(flotante){

flotante.addEventListener("click",(e)=>{

e.preventDefault();

const mensaje=encodeURIComponent(
"Hola 👋, quiero información sobre las artesanías de ORIZA ART."
);

window.open(
`https://wa.me/${CONFIG.whatsapp}?text=${mensaje}`,
"_blank"
);

});

}

/*=========================
  CATÁLOGO DINÁMICO
==========================*/

const catalogo = document.getElementById("catalogo");

if(catalogo){

productos.forEach(producto=>{

catalogo.innerHTML += `

<article class="producto">

<img src="${producto.imagen}" alt="${producto.nombre}">

<h3>${producto.nombre}</h3>

<p>${producto.descripcion}</p>

<a href="producto.html?id=${producto.id}" class="btn-producto">
    Ver detalles
</a>

</article>

`;

});

}

cerrar.onclick=()=>{

modal.style.display="none";

};

window.onclick=(e)=>{

if(e.target===modal){

modal.style.display="none";

}

};