# Graph Report - .  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 65 nodes · 99 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- admin.js
- main.js
- carrito.js
- global.js
- recargarProductos
- guardarFormulario
- guardarCarrito
- calcularTotal
- catalogo.js
- aplicarFiltros
- confirmarPedido
- producto.js
- config.js
- sw.js

## God Nodes (most connected - your core abstractions)
1. `guardarCarrito()` - 8 edges
2. `recargarProductos()` - 7 edges
3. `mostrarToast()` - 6 edges
4. `guardarFormulario()` - 5 edges
5. `confirmarPedido()` - 5 edges
6. `aplicarFiltros()` - 4 edges
7. `iniciarSesion()` - 4 edges
8. `agregarProducto()` - 4 edges
9. `renderizarTabla()` - 3 edges
10. `ordenarDatos()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `guardarFormulario()` --calls--> `recargarProductos()`  [EXTRACTED]
  js/admin.js → js/admin.js  _Bridges community 4 → community 5_
- `iniciarSesion()` --calls--> `recargarProductos()`  [EXTRACTED]
  js/admin.js → js/admin.js  _Bridges community 4 → community 0_
- `recargarProductos()` --calls--> `aplicarFiltros()`  [EXTRACTED]
  js/admin.js → js/admin.js  _Bridges community 4 → community 9_
- `agregarProducto()` --calls--> `guardarCarrito()`  [EXTRACTED]
  js/carrito.js → js/carrito.js  _Bridges community 6 → community 10_
- `guardarCarrito()` --calls--> `renderizarCarrito()`  [EXTRACTED]
  js/carrito.js → js/carrito.js  _Bridges community 6 → community 7_

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "admin.js"
Cohesion: 0.43
Nodes (6): abrirFormulario(), actualizarPreview(), iniciarSesion(), mostrarErrorLogin(), mostrarPanel(), ordenActual

### Community 1 - "main.js"
Cohesion: 0.33
Nodes (5): btnWhatsapp, catalogo, iniciarCatalogoInicio(), mezclar(), observador

### Community 2 - "carrito.js"
Cohesion: 0.47
Nodes (5): actualizarEntregaUI(), carrito, clienteGuardado, mostrarVistaCheckout(), renderizarFormularioCheckout()

### Community 3 - "global.js"
Cohesion: 0.53
Nodes (4): btnInstalar, esFavorito(), obtenerFavoritos(), toggleFavorito()

### Community 4 - "recargarProductos"
Cohesion: 0.60
Nodes (5): actualizarStockRapido(), eliminarProducto(), mostrarToast(), recargarProductos(), toggleEstado()

### Community 5 - "guardarFormulario"
Cohesion: 0.40
Nodes (5): cerrarFormulario(), convertirImagenAWebp(), guardarFormulario(), subirImagenesSupabase(), subirImagenSupabase()

### Community 6 - "guardarCarrito"
Cohesion: 0.50
Nodes (5): actualizarContador(), cambiarCantidad(), guardarCarrito(), quitarProducto(), vaciarCarrito()

### Community 7 - "calcularTotal"
Cohesion: 0.67
Nodes (3): calcularTotal(), generarLinkWhatsApp(), renderizarCarrito()

### Community 8 - "catalogo.js"
Cohesion: 0.67
Nodes (3): iniciarCatalogo(), mostrarProductos(), productos

### Community 9 - "aplicarFiltros"
Cohesion: 1.00
Nodes (3): aplicarFiltros(), ordenarDatos(), renderizarTabla()

### Community 10 - "confirmarPedido"
Cohesion: 0.40
Nodes (5): abrirCarrito(), agregarProducto(), cerrarCarrito(), confirmarPedido(), mostrarVistaLista()

## Knowledge Gaps
- **10 isolated node(s):** `ordenActual`, `carrito`, `clienteGuardado`, `productos`, `CONFIG` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `guardarCarrito()` connect `guardarCarrito` to `carrito.js`, `confirmarPedido`, `calcularTotal`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `recargarProductos()` connect `recargarProductos` to `admin.js`, `aplicarFiltros`, `guardarFormulario`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `mostrarToast()` connect `recargarProductos` to `admin.js`, `guardarFormulario`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `ordenActual`, `carrito`, `clienteGuardado` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._