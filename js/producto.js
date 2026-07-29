let productosCache = null;

async function obtenerProductos() {
    if (productosCache) return productosCache;
    
    const cacheLocal = sessionStorage.getItem("oriza_productos_cache");
    if (cacheLocal) {
        productosCache = JSON.parse(cacheLocal);
        return productosCache;
    }

    if (typeof cargarProductos === "function") {
        productosCache = await cargarProductos();
        if (productosCache && productosCache.length > 0) {
            sessionStorage.setItem("oriza_productos_cache", JSON.stringify(productosCache));
        }
    } else {
        console.error("❌ La función cargarProductos() no está definida.");
        return [];
    }
    return productosCache;
}

async function iniciarProducto() {
    try {
        const productos = await obtenerProductos();
        const parametros = new URLSearchParams(window.location.search);
        const id = Number(parametros.get("id"));

        const producto = productos.find(p => Number(p.id) === id);

        if (!producto) {
            document.title = "Producto no encontrado | ORIZA ART";
            const contenedorPrincipal = document.querySelector("main") || document.body;
            contenedorPrincipal.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <h1>Producto no disponible</h1>
                    <p>El producto que buscas no existe o fue removido.</p>
                    <a href="catalogo.html" class="btn">Volver al catálogo</a>
                </div>
            `;
            return;
        }

        document.title = `${producto.nombre} | ORIZA ART`;

        // 1. Manejo seguro de imágenes
        let fotos = [];
        if (producto.imagen && producto.imagen.startsWith("http")) {
            fotos = producto.imagen.split(",").map(url => url.trim()).filter(Boolean);
        } else if (producto.imagen && !producto.imagen.includes("no-image")) {
            const nombreLimpio = producto.imagen.replace(/^img\//, '');
            const baseNombre = nombreLimpio.replace(/\.webp$/i, "");
            const storageBase = typeof SUPABASE_STORAGE_URL !== 'undefined' ? SUPABASE_STORAGE_URL : '';
            fotos.push(`${storageBase}/${baseNombre}.webp`);
            for (let i = 2; i <= 5; i++) {
                fotos.push(`${storageBase}/${baseNombre}-${i}.webp`);
            }
        } else {
            fotos.push(typeof IMAGEN_DEFAULT_BUCKET !== 'undefined' ? IMAGEN_DEFAULT_BUCKET : '');
        }

        // 2. Cargar imagen principal
        const imgPrincipal = document.getElementById("imgProducto");
        if (imgPrincipal) {
            imgPrincipal.src = fotos[0];
            imgPrincipal.alt = producto.nombre;
            imgPrincipal.onerror = () => {
                if (typeof IMAGEN_DEFAULT_BUCKET !== 'undefined') imgPrincipal.src = IMAGEN_DEFAULT_BUCKET;
            };
        }

        // 3. Cargar Miniaturas
        const galeriaThumbs = document.getElementById("galeriaThumbs");
        if (galeriaThumbs) {
            galeriaThumbs.innerHTML = "";
            fotos.forEach((url, idx) => {
                const thumb = document.createElement("div");
                thumb.className = `thumb-item ${idx === 0 ? "activo" : ""}`;
                
                const imgThumb = document.createElement("img");
                imgThumb.src = url;
                imgThumb.alt = `${producto.nombre} - vista ${idx + 1}`;
                imgThumb.onerror = () => thumb.remove();
                
                thumb.appendChild(imgThumb);
                thumb.addEventListener("click", () => {
                    if (imgPrincipal) {
                        imgPrincipal.style.opacity = "0.3";
                        setTimeout(() => {
                            imgPrincipal.src = url;
                            imgPrincipal.style.opacity = "1";
                        }, 150);
                    }
                    document.querySelectorAll(".thumb-item").forEach(t => t.classList.remove("activo"));
                    thumb.classList.add("activo");
                });

                galeriaThumbs.appendChild(thumb);
            });
        }

        // 4. Rellenar Información
        const nombre = document.getElementById("nombreProducto");
        if (nombre) nombre.textContent = producto.nombre;

        const precio = document.getElementById("precioProducto");
        if (precio) precio.textContent = `S/ ${Number(producto.precio || 0).toFixed(2)}`;

        const desc = document.getElementById("descripcionProducto");
        if (desc) desc.textContent = producto.descripcion || "";

        const mat = document.getElementById("materialesProducto");
        if (mat) {
            if (producto.materiales) {
                mat.innerHTML = `<strong>Materiales:</strong> ${Array.isArray(producto.materiales) ? producto.materiales.join(", ") : producto.materiales}`;
            } else {
                mat.innerHTML = "";
            }
        }

        const cat = document.getElementById("categoriaProducto");
        if (cat) cat.textContent = producto.categoria || "";

        // 5. Configurar Favorito (Vinculado a global.js)
        const btnFavProducto = document.getElementById("btnFavProducto");
        const txtFavProducto = document.getElementById("txtFavProducto");

        if (btnFavProducto) {
            let esFav = typeof esFavorito === "function" ? esFavorito(producto.id) : false;

            const actualizarFavUI = (activo) => {
                btnFavProducto.classList.toggle("activo", activo);
                const iconoSpan = btnFavProducto.querySelector("span");
                if (iconoSpan) iconoSpan.textContent = activo ? "❤️" : "🤍";
                if (txtFavProducto) txtFavProducto.textContent = activo ? "Guardado en favoritos" : "Guardar en favoritos";
            };

            actualizarFavUI(esFav);

            btnFavProducto.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof toggleFavorito === "function") {
                    esFav = toggleFavorito(producto.id);
                    actualizarFavUI(esFav);
                } else {
                    console.error("❌ toggleFavorito() no está disponible en global.js");
                }
            });
        }

        // 6. Configurar Compartir
        const btnShareProducto = document.getElementById("btnShareProducto");
        if (btnShareProducto) {
            btnShareProducto.addEventListener("click", (e) => {
                e.preventDefault();
                const urlActual = window.location.href;
                if (typeof compartirProducto === "function") {
                    compartirProducto(producto.nombre, producto.descripcion, urlActual);
                }
            });
        }

        // 7. Configurar WhatsApp
        const btnWhatsapp = document.getElementById("btnWhatsapp");
        if (btnWhatsapp) {
            const numeroWA = (typeof CONFIG !== "undefined" && CONFIG.whatsapp) ? CONFIG.whatsapp : "51936235607";
            const textoMensaje = `Hola ORIZA ART, me interesa consultar sobre: ${producto.nombre}`;
            btnWhatsapp.href = `https://wa.me/${numeroWA}?text=${encodeURIComponent(textoMensaje)}`;
        }

        // 8. Configurar Carrito
        const btnCarrito = document.getElementById("btnAgregarCarrito");
        if (btnCarrito) {
            if (producto.agotado) {
                btnCarrito.disabled = true;
                btnCarrito.textContent = "Agotado";
                btnCarrito.classList.add("agotado");
            } else {
                btnCarrito.addEventListener("click", (e) => {
                    e.preventDefault();
                    if (typeof agregarProducto === "function") {
                        agregarProducto({ ...producto, imagen: fotos[0] });
                    } else if (typeof agregarAlCarrito === "function") {
                        agregarAlCarrito({ ...producto, imagen: fotos[0] });
                    }
                });
            }
        }

        const mainProducto = document.querySelector(".producto");
        if (mainProducto) {
            requestAnimationFrame(() => mainProducto.classList.add("cargado"));
        }

    } catch (error) {
        console.error("❌ Error al iniciar producto:", error);
    }
}

document.addEventListener("DOMContentLoaded", iniciarProducto);