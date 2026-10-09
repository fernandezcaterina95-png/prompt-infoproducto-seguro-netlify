# Portal Mi Infancia Saludable

Versión privada de revisión. Incluye seis etapas y dos bonos; 22 documentos completos en un lector por páginas. Última etapa mostrada como 5 a 10 años por solicitud de la creadora; los documentos originales dicen 6 a 10 años.

Las páginas se preparan desde los PDFs originales con `work/prepare_library.py`, fuera del repositorio. Luego `node portal/build.mjs` copia la interfaz a `dist`. Los materiales están excluidos de Git: el repositorio público guarda solamente código, nunca los ebooks de pago.

Publicar el directorio dist únicamente en un proyecto privado hasta configurar las cuentas y la autorización por compra. Shopify se integrará posteriormente: esta versión no verifica compras ni concede acceso de comprador. La privacidad del proyecto Netlify protege la revisión para el equipo; no sustituye la autorización individual de clientes.

Las marcas y la última lectura viven en localStorage de cada navegador. No se sincronizan entre dispositivos. El lector ofrece páginas anterior/siguiente, salto por número, zoom, búsqueda en el texto de la parte abierta y lectura del texto extraído.

## Mi calculadora de cocina

Incluye 391 recetas extraídas de los ebooks por etapa. Ajusta cantidades por rendimiento original y número de preparaciones; conserva medidas no numéricas como texto original. La lista de compras suma solo ingredientes iguales con unidades compatibles, convierte kg/g y litros/ml y conserva separadas las medidas domésticas. Permite marcar productos, copiar y descargar la lista. El plan queda guardado en el navegador. No incluye precios, monedas ni cálculos de costos.

La versión se hizo pública por autorización explícita de la creadora. La integración de compras con Shopify sigue pendiente.
