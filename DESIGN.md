# Design Promo · Sistema de diseño de la página de prueba

**Dirección:** el lenguaje de shopify.com/co (hojas oscuras apiladas, titulares enormes y livianos, mucho aire, producto en primer plano) con la identidad de Design Promo: azul de marca y naranja como única señal de acción.

Referencia medida en el navegador: shopify.com/co a 1440px. Se toma la estructura, el ritmo y las interacciones. No se copian textos, imágenes, logos ni marcas de Shopify.

**Solo tema oscuro**, como la referencia. No hay modo claro.

**Sitio independiente:** vive en esta carpeta y no depende de WordPress. Imágenes y tipografía son locales, y `servidor.js` lo sirve solo en este PC. No se modifica nada de designpromo.co.

## Color

| Token | Valor | Rol |
| --- | --- | --- |
| `--ink-950` | `#05081A` | Fondo de la página, detrás de las hojas |
| `--ink-900` | `#0A0F2C` | Hoja principal |
| `--navy-800` | `#111A42` | Hoja azul y superficies elevadas |
| `--navy-700` | `#1B275F` | Azul de marca: tarjetas destacadas |
| `--navy-600` | `#2C3D8F` | Brillo de los degradados azules |
| `--ember-900` | `#1E0F06` | Hoja cálida: tercer tono de la página |
| `--orange` | `#FF6900` | Primario: botón principal, enlaces y cifras clave |
| `--orange-hover` | `#FF7F26` | Hover del primario |
| `--on-orange` | `#0A0F2C` | Texto sobre naranja |
| `--text` | `#FFFFFF` | Títulos y texto principal |
| `--text-2` | `#C4C9EA` | Texto secundario |
| `--text-3` | `#8D93B8` | Notas y etiquetas |
| `--line` | `rgba(255,255,255,.14)` | Bordes y divisores |
| `--paper` | `#FFFFFF` | Fondo de las fichas de producto |
| `--wa` | `#25D366` | Solo WhatsApp y confirmaciones |
| `--warning` | `#FCB900` | Avisos, como "agotado" |
| `--error` | `#FF8A80` | Errores de formulario |

Contraste comprobado sobre `--ink-900`: texto 19:1, `--text-2` 11,5:1, `--text-3` 6,3:1, naranja 6,5:1.

**El botón naranja lleva texto oscuro.** Blanco sobre `#FF6900` da 2,9:1 y no cumple; `--on-orange` da 6,5:1.

## Tipografía

Inter variable (`opsz` 14–32, pesos 300–700), archivo local en `assets/fonts` con `font-display: swap` y su licencia OFL. El eje óptico da el corte de display en los titulares. La firma visual es el peso liviano a gran tamaño.

| Nivel | Escritorio | Móvil | Interlínea | Tracking | Peso |
| --- | --- | --- | --- | --- | --- |
| `display-1` | 96px | 42px | 1.08 | -0.02em | 300 |
| `display-2` | 64px | 40px | 1.08 | -0.02em | 330 |
| `h2` | 56px | 36px | 1.08 | -0.03em | 330 |
| `h3` | 44px | 30px | 1.1 | -0.01em | 330 |
| `h4` | 20px | 20px | 1.3 | 0 | 450 |
| `body-lg` | 20px | 18px | 1.5 | 0 | 400 |
| `body` | 16px | 16px | 1.5 | 0 | 400 |
| `small` | 14px | 14px | 1.43 | 0 | 400 |

Texto corrido: máximo 65 caracteres por línea.

## Espaciado

Escala base 4: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

- Sección: 128px en escritorio, 80px en móvil.
- Margen lateral: `clamp(16px, 6vw, 88px)`.
- Ancho de contenido: 1264px como máximo.

## Forma y profundidad

- Radios: 12px (chips, miniaturas), 24px (tarjetas), 48px (borde superior de las hojas, 32px en móvil), píldora en botones.
- Sombra única, solo para maquetas flotantes: `0 24px 64px rgba(0,0,0,.45)`.
- Las hojas se montan sobre la anterior con el borde superior redondeado.

## Componentes

- **Botón primario:** píldora naranja, texto `--on-orange`, 16px peso 550, 48px de alto. Hover `--orange-hover`. Desactivado al 40%.
- **Botón secundario:** píldora transparente con borde blanco de 1px. Hover con relleno blanco al 10%.
- **Botón discreto:** texto con subrayado.
- **Foco:** contorno blanco de 2px con 2px de separación, en todos los elementos interactivos.
- **Enlaces:** subrayados dentro del texto.
- **Navegación:** transparente sobre el hero, sólida al hacer scroll. Menús por clic, teclado y hover. En móvil, menú a pantalla completa.
- **Chips de selección:** píldora con borde; la elegida va en blanco con texto oscuro.
- **Campos:** fondo `--navy-800`, borde `--line`, radio 12px, etiqueta siempre visible.
- **Tarjetas:** imagen arriba y texto debajo, sin borde; las destacadas llevan degradado azul.
- **Ficha de producto:** fondo `--paper` con radio 24px, para las fotos sobre blanco.
- **Pie:** logo y cuatro columnas de enlaces, con una barra legal abajo.

## Imágenes e íconos

- Solo imágenes reales de Design Promo, copiadas a `assets/img` y optimizadas en JPEG.
- A pantalla completa: escenas de taller con velo oscuro para asegurar el contraste.
- Producto sobre blanco: siempre dentro de una ficha `--paper`, nunca suelto sobre el fondo oscuro.
- No usar imágenes con personajes o marcas de terceros. Ya se descartaron o recortaron: apliques (Superman, Batman), mug con Cartman, busos con Bugs Bunny, botones (Coca-Cola, BMW, Burger King), portavasos (Angry Birds), llaveros (Duff, Starbucks), cintas (Facebook, L'Oréal) y gorras con KISS o The Beatles.
- Logo: `marca/logo-design-promo.png`, transparente, pensado para fondo oscuro. No aplicarle filtros.
- Sello de fabricante: tiene fondo blanco, así que va como calcomanía con radio y sombra.
- Íconos: un solo set SVG en línea, trazo 1.8, extremos redondeados. Sin emojis.

## Movimiento

- Rotación del titular cada 3,2s con fundido de la imagen de fondo.
- Texto declarativo que se ilumina con el scroll.
- Carruseles continuos que se pausan con el puntero o el foco.
- Entradas al hacer scroll: 24px de desplazamiento y 0,6s, una sola vez.
- Con `prefers-reduced-motion` todo queda quieto y el contenido se ve completo.

## Honestidad del contenido

- Los logos y testimonios del Inicio son ficticios, pedidos para ver cómo quedaría la página. Llevan el rótulo `.demo-tag` y el sitio tiene `noindex`.
- Antes de publicar el sitio hay que cambiarlos por reales o quitarlos.
- Sin cifras ni premios inventados: las cifras salen del sitio actual.
- Precios solo los publicados en octubre de 2026, con nota para confirmarlos.
