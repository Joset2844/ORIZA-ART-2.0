// ==================================================
// ORIZA ART — Backend del panel de administración
// Extensions > Apps Script en tu Google Sheet, pega esto,
// cambia CLAVE_ADMIN, y sigue ADMIN_SETUP.md para desplegar.
// ==================================================

const NOMBRE_HOJA = "Productos";
const CLAVE_ADMIN = "CAMBIA_ESTA_CLAVE";

function doGet(e) {
  const accion = e.parameter.action;

  if (accion === "listar") {
    if (e.parameter.password !== CLAVE_ADMIN) {
      return respuesta({ error: "Clave incorrecta" });
    }
    return respuesta({ productos: listarProductos() });
  }

  return respuesta({ error: "Acción no reconocida" });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta({ error: "Datos inválidos" });
  }

  if (body.password !== CLAVE_ADMIN) {
    return respuesta({ error: "Clave incorrecta" });
  }

  if (body.action === "guardar") {
    return respuesta(guardarProducto(body.producto));
  }

  if (body.action === "eliminar") {
    return respuesta(eliminarProducto(body.id));
  }

  return respuesta({ error: "Acción no reconocida" });
}

function hoja() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
}

function listarProductos() {
  const datos = hoja().getDataRange().getValues();
  const filas = datos.slice(1);

  return filas
    .map(fila => ({
      id: fila[1],
      tipo: fila[2],
      nombre: fila[3],
      precio: fila[4],
      material: fila[5],
      descripcion: fila[6],
      imagen: fila[7],
      estado: fila[8],
      destacado: fila[9],
      orden: fila[10],
      stock: fila[11]
    }))
    .filter(p => p.id);
}

function guardarProducto(p) {
  const s = hoja();
  const datos = s.getDataRange().getValues();

  let filaExistente = -1;
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][1] === p.id) {
      filaExistente = i + 1;
      break;
    }
  }

  const valores = [
    filaExistente > 0 ? datos[filaExistente - 1][0] : datos.length,
    p.id,
    p.tipo,
    p.nombre,
    p.precio,
    p.material,
    p.descripcion,
    p.imagen,
    p.estado,
    p.destacado,
    p.orden,
    p.stock
  ];

  if (filaExistente > 0) {
    s.getRange(filaExistente, 1, 1, valores.length).setValues([valores]);
    return { ok: true, accion: "actualizado" };
  }

  s.appendRow(valores);
  return { ok: true, accion: "creado" };
}

function eliminarProducto(id) {
  const s = hoja();
  const datos = s.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][1] === id) {
      s.deleteRow(i + 1);
      return { ok: true };
    }
  }

  return { error: "Producto no encontrado" };
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
