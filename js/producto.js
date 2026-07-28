let productosCache = null;

async function obtenerProductos() {
    if (productosCache) return productosCache;
    
    // 1. Revisa si ya están en la memoria de la sesión
    const cacheLocal = sessionStorage.getItem("oriza_productos_cache");
    if (cacheLocal) {
        productosCache = JSON.parse(cacheLocal);
        return productosCache;
    }

    // 2. Si no están en caché, los consulta al servidor
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

        const producto = productos.find(p => p.id === id);

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

       // 1. Identificador del producto
        // Garantizamos que tome el ID numérico o el código según como venga del Apps Script
        const idCodigo = producto.id || producto.codigo;
        let fotos = [];

        if (producto.imagen && producto.imagen.startsWith("http")) {
            fotos = producto.imagen.split(",").map(url => url.trim()).filter(Boolean);
        } else if (producto.imagen && !producto.imagen.includes("no-image")) {
            // Si el objeto ya trae una ruta completa
            const rutaLimpia = producto.imagen.replace(/\.webp$/i, "");
            fotos.push(`${rutaLimpia}.webp`);
            for (let i = 2; i <= 5; i++) {
                fotos.push(`${rutaLimpia}-${i}.webp`);
            }
        } else {
            // Convención por ID por defecto en carpeta img/
            fotos.push(`img/${idCodigo}.webp`);
            for (let i = 2; i <= 5; i++) {
                fotos.push(`img/${idCodigo}-${i}.webp`);
            }
        }

        console.log("📸 Rutas de imágenes que se intentarán cargar:", fotos);

        // 2. Renderizado de Imagen Principal
        const imgPrincipal = document.getElementById("imgProducto");
        if (imgPrincipal) {
            imgPrincipal.src = fotos[0];
            imgPrincipal.alt = producto.nombre;
            imgPrincipal.onerror = () => {
                imgPrincipal.src = "img/no-image.webp";
            };
        }

        // 3. Renderizado de Galería de Miniaturas (Directo)
        const galeriaThumbs = document.getElementById("galeriaThumbs");
        if (galeriaThumbs) {
            galeriaThumbs.innerHTML = "";

            fotos.forEach((url, idx) => {
                const thumb = document.createElement("div");
                thumb.className = `thumb-item ${idx === 0 ? "activo" : ""}`;
                
                const imgThumb = document.createElement("img");
                imgThumb.src = url;
                imgThumb.alt = `${producto.nombre} - vista ${idx + 1}`;

                // Si la imagen existe, la mantiene. Si da error 404 (no existe), borra esa miniatura.
                imgThumb.onerror = () => {
                    console.warn(`⚠️ No se encontró la imagen variante: ${url}`);
                    thumb.remove();
                };

                imgThumb.onload = () => {
                    console.log(`✅ Imagen cargada con éxito: ${url}`);
                };

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

        // 4. Cargar Datos del Producto
        const nombre = document.getElementById("nombreProducto");
        if (nombre) nombre.textContent = producto.nombre;

        const precio = document.getElementById("precioProducto");
        if (precio) precio.textContent = `S/ ${Number(producto.precio || 0).toFixed(2)}`;

        const desc = document.getElementById("descripcionProducto");
        if (desc) desc.textContent = producto.descripcion || "";

        const mat = document.getElementById("materialesProducto");
        if (mat && producto.materiales) {
            mat.innerHTML = `<strong>Materiales:</strong> ${Array.isArray(producto.materiales) ? producto.materiales.join(", ") : producto.materiales}`;
        }

        const cat = document.getElementById("categoriaProducto");
        if (cat) cat.textContent = producto.categoria || "";

        const mainProducto = document.querySelector(".producto");
        if (mainProducto) {
            requestAnimationFrame(() => {
                mainProducto.classList.add("cargado");
            });
        }

        // Dentro de iniciarProducto(), justo después de rellenar los datos del producto:

        // 7. Configurar Favorito en Ficha Producto
        const btnFavProducto = document.getElementById("btnFavProducto");
        const txtFavProducto = document.getElementById("txtFavProducto");

        if (btnFavProducto) {
            let esFav = esFavorito(producto.id);
            actualizarBotonFav(esFav);

            btnFavProducto.addEventListener("click", () => {
                esFav = toggleFavorito(producto.id);
                actualizarBotonFav(esFav);
            });
        }

        function actualizarBotonFav(activo) {
            if (!btnFavProducto) return;
            btnFavProducto.classList.toggle("activo", activo);
            btnFavProducto.querySelector("span").textContent = activo ? "❤️" : "🤍";
            if (txtFavProducto) {
                txtFavProducto.textContent = activo ? "Guardado en favoritos" : "Guardar en favoritos";
            }
        }

        // 8. Configurar Compartir en Ficha Producto
        const btnShareProducto = document.getElementById("btnShareProducto");
        if (btnShareProducto) {
            btnShareProducto.addEventListener("click", () => {
                compartirProducto(producto.nombre, producto.descripcion);
            });
        }

        // 5. Configurar Botón WhatsApp
        const btnWhatsapp = document.getElementById("btnWhatsapp");
        if (btnWhatsapp) {
            const numeroWA = (typeof CONFIG !== "undefined" && CONFIG.whatsapp) ? CONFIG.whatsapp : "";
            btnWhatsapp.href = `https://wa.me/${numeroWA}?text=${encodeURIComponent(
                `Hola, me interesa ${producto.nombre}.`
            )}`;
        }

        // 6. Configurar Botón Agregar al Carrito
        const btnCarrito = document.getElementById("btnAgregarCarrito");
        if (btnCarrito) {
            if (producto.agotado) {
                btnCarrito.disabled = true;
                btnCarrito.textContent = "Agotado";
                btnCarrito.classList.add("agotado");
            } else {
                btnCarrito.addEventListener("click", () => {
                    if (typeof agregarProducto === "function") {
                        agregarProducto({
                            ...producto,
                            imagen: fotos[0]
                        });
                    }
                });

                if (producto.stock && producto.stock <= 3) {
                    const aviso = document.createElement("p");
                    aviso.className = "aviso-stock";
                    aviso.textContent = `¡Solo quedan ${producto.stock} unidades!`;
                    btnCarrito.insertAdjacentElement("afterend", aviso);
                }
            }
        }

    } catch (error) {
        console.error("❌ Error al cargar producto:", error);
    }
}

document.addEventListener("DOMContentLoaded", iniciarProducto);