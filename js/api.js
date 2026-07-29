async function cargarProductos() {
    if (!supabaseClient) {
        console.error("❌ El cliente de Supabase no está inicializado.");
        return [];
    }

    // Consulta todos los registros de la tabla 'productos'
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*');

    if (error) {
        console.error("❌ Error al consultar Supabase:", error);
        return [];
    }

    return data
        .filter(r => {
            const estado = (r.estado || r.ESTADO || "").toString().toLowerCase();
            return estado === "activo";
        })
        .sort((a, b) => {
            const ordenA = Number(a.orden ?? a.ORDEN ?? 999);
            const ordenB = Number(b.orden ?? b.ORDEN ?? 999);
            return ordenA - ordenB;
        })
        .map((r, idx) => {
            const codigo = (r.id_codigo || r.codigo || r.ID || "").toString().trim().toUpperCase();
            const numId = Number(r.n_num || r['N°'] || r.id || (idx + 1));
            const stockRaw = r.stock ?? r.STOCK;
            const stock = (stockRaw === undefined || stockRaw === null || stockRaw === "") ? 999 : Number(stockRaw);
            const materialStr = (r.material || r.MATERIAL || "").toString();
            const imagenRaw = (r.imagen || r.VACIO || "").toString().trim();

            // Lógica para asignar la imagen desde el Bucket:
            let urlImagen = IMAGEN_DEFAULT_BUCKET;

            if (imagenRaw.startsWith("http")) {
                urlImagen = imagenRaw;
            } else if (imagenRaw && !imagenRaw.includes("no-image")) {
                // Si viene sólo el nombre del archivo (ej. foto.webp)
                const nombreLimpio = imagenRaw.replace(/^img\//, '');
                urlImagen = `${SUPABASE_STORAGE_URL}/${nombreLimpio}`;
            } else if (codigo) {
                // Si no tiene campo de imagen, usa el código apuntando al bucket
                urlImagen = `${SUPABASE_STORAGE_URL}/${codigo}.webp`;
            }

            return {
                id: numId,
                codigo: codigo,
                categoria: (r.tipo || r.TIPO || "").toString(),
                nombre: (r.nombre || r.NOMBRE || "").toString(),
                precio: Number(r.precio ?? r.PRECIO ?? 0),
                materiales: materialStr
                    ? materialStr.split(",").map(x => x.trim()).filter(Boolean)
                    : [],
                descripcion: (r.descripcion || r['DESCRIPCION ESPIRITUAL'] || "").toString(),
                imagen: urlImagen,
                destacado: (r.destacado || r.DESTACADO || "").toString().toLowerCase() === "si",
                orden: Number(r.orden ?? r.ORDEN ?? 999),
                stock: stock,
                agotado: stock <= 0
            };
        });
}