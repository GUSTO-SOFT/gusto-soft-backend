const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const results = [];

function addResult(test, ok, detail = '') {
  results.push({ test, ok: Boolean(ok), detail });
}

async function call(method, path, token, body, accept) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (accept) {
    headers.Accept = accept;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    data,
  };
}

async function login(email) {
  const response = await call('POST', '/auth/login', null, { email, password: 'Password123!' });
  return response.data?.access_token;
}

async function eventually(callback, attempts = 5, delayMs = 300) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await callback();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

try {
  const admin = await login('admin@gustosoft.local');
  const waiter = await login('mesero@gustosoft.local');
  const chef = await login('chef@gustosoft.local');
  addResult('Auth demo users login', admin && waiter && chef, 'ADMIN/MESERO/CHEF tokens generated');

  const tables = await call('GET', '/mesas?estado=DISPONIBLE&page=1&limit=20', admin);
  addResult('RF01 GET /mesas?estado=DISPONIBLE', tables.status === 200 && Array.isArray(tables.data.data), `status=${tables.status}`);

  let tableId = tables.data.data?.[0]?.id;
  if (tableId) {
    const openTable = await call('POST', `/mesas/${tableId}/abrir`, waiter);
    addResult('RF01 POST /mesas/{id}/abrir', [200, 201].includes(openTable.status) && openTable.data.estado === 'OCUPADA', `status=${openTable.status}, mesa=${tableId}`);
  } else {
    const occupied = await call('GET', '/mesas?estado=OCUPADA&page=1&limit=20', admin);
    tableId = occupied.data.data?.[0]?.id;
    addResult('RF01 POST /mesas/{id}/abrir', true, 'SKIP: no available table');
  }

  const users = await call('GET', '/usuarios?rol=MESERO&estado=ACTIVO', admin);
  const userRows = Array.isArray(users.data) ? users.data : users.data.data;
  const waiterId = userRows?.[0]?.id;
  addResult('RF02 GET /usuarios?rol=MESERO&estado=ACTIVO', users.status === 200 && waiterId, `mesero_id=${waiterId}`);

  const assign = await call('PATCH', `/mesas/${tableId}/asignar`, admin, { mesero_id: waiterId });
  addResult('RF02 PATCH /mesas/{id}/asignar', assign.status === 200 && assign.data.mesero_id === waiterId, `status=${assign.status}`);

  const stamp = Date.now();
  const ingredientBody = {
    nombre: `QA Ingredient ${stamp}`,
    unidad_medida: 'KG',
    stock_actual: 20,
    stock_minimo: 3,
  };

  const ingredient = await call('POST', '/inventario/ingredientes', admin, ingredientBody);
  addResult('RF14 POST /inventario/ingredientes ADMIN', ingredient.status === 201 && ingredient.data.stock_actual === 20, `id=${ingredient.data?.id}, status=${ingredient.status}`);

  const duplicateIngredient = await call('POST', '/inventario/ingredientes', admin, ingredientBody);
  addResult('RF14 duplicate ingredient 422', duplicateIngredient.status === 422 && duplicateIngredient.data.code === 'INGREDIENTE_DUPLICADO', `status=${duplicateIngredient.status}, code=${duplicateIngredient.data?.code}`);

  const forbiddenIngredient = await call('POST', '/inventario/ingredientes', waiter, {
    nombre: `Forbidden ${stamp}`,
    unidad_medida: 'KG',
    stock_actual: 1,
    stock_minimo: 1,
  });
  addResult('RF14 POST ingrediente non-admin 403', forbiddenIngredient.status === 403, `status=${forbiddenIngredient.status}`);

  const ingredientList = await call('GET', '/inventario/ingredientes?page=1&limit=100', admin);
  addResult('RF14 GET /inventario/ingredientes paginated', ingredientList.status === 200 && ingredientList.data.meta.total >= 1 && 'stock_actual' in ingredientList.data.data[0], `total=${ingredientList.data.meta.total}`);

  const product = await call('POST', '/menu/productos', admin, {
    nombre: `QA Product ${stamp}`,
    categoria: 'PLATO_FUERTE',
    precio: 15000,
    tiempo_preparacion: 10,
    ingredientes: [{ ingrediente_id: ingredient.data.id, cantidad: 2 }],
  });
  addResult('RF11 POST /menu/productos', product.status === 201 && product.data.ingredientes[0].cantidad === 2, `id=${product.data?.id}, status=${product.status}`);

  const productDetail = await call('GET', `/menu/productos/${product.data.id}`, admin);
  addResult('RF12 GET /menu/productos/{id}', productDetail.status === 200 && productDetail.data.id === product.data.id, `status=${productDetail.status}`);

  const order = await call('POST', '/pedidos', waiter, {
    mesa_id: tableId,
    detalles: [{ producto_id: product.data.id, cantidad: 1 }],
  });
  addResult('RF04 POST /pedidos', order.status === 201 && order.data.estado === 'BORRADOR', `id=${order.data?.id}, status=${order.status}`);

  const patchedOrder = await call('PATCH', `/pedidos/${order.data.id}/detalles`, waiter, {
    detalles: [{ producto_id: product.data.id, cantidad: 2, notas: 'Sin sal' }],
  });
  addResult('RF05/RF06 PATCH detalles cantidad+notas', patchedOrder.status === 200 && patchedOrder.data.detalles[0].cantidad === 2 && patchedOrder.data.detalles[0].notas === 'Sin sal', `status=${patchedOrder.status}`);

  const sentOrder = await call('POST', `/pedidos/${order.data.id}/enviar`, waiter);
  addResult('RF07/RF15 POST /pedidos/{id}/enviar', [200, 201].includes(sentOrder.status) && sentOrder.data.estado === 'PENDIENTE', `status=${sentOrder.status}, estado=${sentOrder.data?.estado}`);

  const stockRows = (await call('GET', '/inventario/ingredientes?page=1&limit=100', admin)).data.data;
  const stockItem = stockRows.find((item) => item.id === ingredient.data.id);
  addResult('RF15 stock descontado por receta', stockItem?.stock_actual === 16, `stock_actual=${stockItem?.stock_actual}, esperado=16`);

  const adjustment = await call('POST', `/inventario/ingredientes/${ingredient.data.id}/ajuste`, admin, {
    delta: 1.5,
    motivo: 'QA ajuste entrada',
  });
  addResult('RF15 POST ajuste', [200, 201].includes(adjustment.status) && adjustment.data.stock_actual === 17.5, `status=${adjustment.status}, stock=${adjustment.data?.stock_actual}`);

  const badAdjustment = await call('POST', `/inventario/ingredientes/${ingredient.data.id}/ajuste`, admin, {
    delta: -9999,
    motivo: 'QA negativo',
  });
  addResult('RF15 ajuste negativo 422 STOCK_INSUFICIENTE', badAdjustment.status === 422 && badAdjustment.data.code === 'STOCK_INSUFICIENTE', `status=${badAdjustment.status}, code=${badAdjustment.data?.code}`);

  const movements = await call('GET', `/inventario/ingredientes/${ingredient.data.id}/movimientos?page=1&limit=10`, admin);
  addResult('RF15 GET movimientos paginado DESC', movements.status === 200 && movements.data.data.length >= 2, `count=${movements.data?.data?.length}`);

  const kitchen = await call('GET', '/cocina/pedidos?estado=PENDIENTE,EN_PREPARACION', chef);
  addResult('RF08 GET /cocina/pedidos', kitchen.status === 200 && Array.isArray(kitchen.data), `status=${kitchen.status}`);

  const inPreparation = await call('PATCH', `/pedidos/${order.data.id}/estado`, chef, { estado: 'EN_PREPARACION' });
  addResult('RF09 PATCH estado EN_PREPARACION', inPreparation.status === 200 && inPreparation.data.estado === 'EN_PREPARACION', `status=${inPreparation.status}`);

  const ready = await call('PATCH', `/pedidos/${order.data.id}/estado`, chef, { estado: 'LISTO' });
  addResult('RF09/RF10 PATCH estado LISTO + notificacion', ready.status === 200 && ready.data.estado === 'LISTO', `status=${ready.status}`);

  const notifications = await call('GET', `/pedidos/${order.data.id}/notificaciones`, waiter);
  addResult('RF10 GET notificaciones', notifications.status === 200 && notifications.data.length >= 1, `count=${notifications.data?.length}`);

  const delivered = await call('PATCH', `/pedidos/${order.data.id}/confirmar-entrega`, waiter);
  addResult('RF10 PATCH confirmar-entrega', delivered.status === 200 && delivered.data.estado === 'ENTREGADO', `status=${delivered.status}`);

  const soldCheck = await eventually(async () => {
    const soldProducts = await call('GET', '/reportes/productos-vendidos', admin);
    const soldItem = soldProducts.data.find((item) => Number(item.producto_id) === Number(product.data.id));
    return soldProducts.status === 200 && soldItem?.total_unidades === 2
      ? { soldProducts, soldItem }
      : null;
  });
  addResult('RF23 GET productos-vendidos default 30d', Boolean(soldCheck), `unidades=${soldCheck?.soldItem?.total_unidades}`);

  const invalidRange = await call('GET', '/reportes/productos-vendidos?date_from=2026-06-01T00:00:00.000Z&date_to=2026-05-01T00:00:00.000Z', admin);
  addResult('RF23 rango invalido 400', invalidRange.status === 400 && invalidRange.data.code === 'RANGO_FECHAS_INVALIDO', `status=${invalidRange.status}, code=${invalidRange.data?.code}`);

  const csv = await call('GET', '/reportes/productos-vendidos', admin, null, 'text/csv');
  addResult('RF23 export CSV Content-Disposition', csv.status === 200 && /attachment/.test(csv.headers['content-disposition'] ?? ''), `content-type=${csv.headers['content-type']}`);

  const pdf = await call('GET', '/reportes/productos-vendidos', admin, null, 'application/pdf');
  addResult('RF23 export PDF Content-Disposition', pdf.status === 200 && /attachment/.test(pdf.headers['content-disposition'] ?? ''), `content-type=${pdf.headers['content-type']}`);

  const forbiddenReport = await call('GET', '/reportes/productos-vendidos', chef);
  addResult('RF23 report non-admin 403', forbiddenReport.status === 403, `status=${forbiddenReport.status}`);

  const waste = await call('GET', `/reportes/desperdicio?ingrediente_id=${ingredient.data.id}`, admin);
  const wasteItem = waste.data[0];
  addResult('RF25 GET desperdicio ingrediente_id', waste.status === 200 && wasteItem?.ingrediente_id === ingredient.data.id && 'alerta' in wasteItem, `teorico=${wasteItem?.consumo_teorico}, real=${wasteItem?.consumo_real}, alerta=${wasteItem?.alerta}`);
} catch (error) {
  addResult('UNCAUGHT TEST ERROR', false, error?.stack ?? String(error));
}

console.table(results);
const failures = results.filter((result) => !result.ok);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
