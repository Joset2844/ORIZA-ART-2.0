const parametros = new URLSearchParams(window.location.search);

const id = Number(parametros.get("id"));

const producto = productos.find(p => p.id === id);

if (producto) {
  
  document.getElementById("imgProducto").src = producto.imagen;
  
  document.getElementById("imgProducto").alt = producto.nombre;
  
  document.getElementById("nombreProducto").textContent = producto.nombre;
  
  document.getElementById("descripcionProducto").textContent = producto.descripcion;
  
  document.getElementById("categoriaProducto").textContent = producto.categoria;
  
  document.getElementById("btnWhatsapp").href =
`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(
`Hola 👋, me interesa ${producto.nombre}.`
)}`;

} else {
    window.location.href = "catalogo.html"; 
  
}