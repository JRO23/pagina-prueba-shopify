# Design Promo · Sistema de diseño de la página de prueba

**Dirección:** el lenguaje de shopify.com/co (hojas apiladas, titulares enormes y livianos, aire medido, producto en primer plano) con la identidad de Design Promo: fondos crema, azul como color de acción y naranja como acento.

Referencia medida en el navegador: shopify.com/co a 1440px. Se toma la estructura, el ritmo y las interacciones. No se copian textos, imágenes, logos ni marcas de Shopify.

**Solo tema claro.** No hay modo oscuro. Hay zonas oscuras puntuales: el hero, la cabecera, el pie y la hoja del fabricante.

**Sitio independiente:** vive en esta carpeta y no depende de WordPress. Imágenes y tipografía son locales, y `servidor.js` lo sirve solo en este PC. No se modifica nada de designpromo.co.

## Color

| Token | Valor | Rol |
| --- | --- | --- |
| `--color-fondo` | `#FAF8F4` | Fondo de la página y hojas principales |
| `--color-seccion` | `#F1ECE2` | Hoja alterna y tarjetas destacadas |
| `--color-borde` | `#E4DED2` | Bordes y divisores |
| `--color-texto` | `#14213D` | Títulos y texto principal |
| `--color-texto-suave` | `#5B6475` | Texto secundario, notas y etiquetas |
| `--color-primario` | `#1E3FA6` | Botón principal y elementos seleccionados |
| `--color-primario-hover` | `#183285` | Hover del primario |
| `--color-acento` | `#F07A1A` | Botón principal sobre zonas oscuras y detalles gráficos |
| `--color-acento-texto` | `#D9610C` | Numerales, estrellas e íconos naranjas sobre fondo claro |
| `--color-detalle` | `#FFC43D` | Destacados sobre zonas oscuras y avisos |
| `--color-detalle-texto` | `#A67C00` | El amarillo de la marca sobre fondo claro, solo en texto grande |
| `--color-oferta` | `#D62828` | Ofertas, errores y cuarta oración de la frase del Inicio |
| `--color-exito` | `#1FA34A` | Botón flotante de WhatsApp, confirmaciones y primera oración de la frase del Inicio |
| `--color-whatsapp` | `#32D951` | Verde del logo de WhatsApp: botón "Enviar por WhatsApp" y logo sobre fondo claro |
| `--color-whatsapp-hover` | `#27C044` | Hover del botón de WhatsApp |
| `--franja-marca` | degradado de 4 colores | Línea de 4px bajo la cabecera sólida y sobre el pie |

Derivados, en `styles.css`: `--color-blanco` (fichas de producto), `--color-tinta` (el azul noche fijo, que no cambia dentro de las zonas oscuras; es el fondo de la hoja del fabricante), `--color-borde-fuerte` (campos y botones redondos), `--tinte` (hover), `--destaque` y `--btn-*`.

**Zonas oscuras:** `.hero`, `.site-header`, `.site-footer`, `.sheet--azul` y las caras oscuras del carnet redefinen los tokens en `styles.css`. Lo que va dentro se adapta solo: texto blanco, destaque amarillo y botón naranja.

Contraste comprobado sobre `--color-fondo`: texto 15,1:1, `--color-texto-suave` 5,6:1, primario 8,6:1. Blanco sobre primario 9,1:1. Amarillo sobre primario 5,7:1.

**El botón naranja lleva texto oscuro.** Blanco sobre `#F07A1A` da 2,8:1 y no cumple; `--color-tinta` da 5,7:1. Igual en verde: blanco 3,3:1, `--color-tinta` 4,9:1. Sobre `--color-whatsapp`: blanco 1,9:1, `--color-tinta` 8,6:1; el texto va en tinta y solo el logo va en blanco.

**`--color-acento-texto` no sirve para texto pequeño.** Da 3,5:1 sobre el fondo y 3,2:1 sobre la sección. Solo va en numerales, estrellas, íconos y texto grande. Las etiquetas y los precios van en `--color-primario`.

**`--color-detalle` no se lee sobre fondo claro.** Da 1,5:1 sobre el fondo. Ahí va `--color-detalle-texto`, que da 3,6:1 y solo sirve en texto grande. Como marcador, detrás de `--color-tinta`, sí se usa el amarillo real.

**Marcador de la frase del Inicio:** verde, amarillo y naranja llevan `--color-tinta`; el rojo lleva blanco, que da 4,7:1.

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

- Sección: 64px en escritorio, 40px en móvil. Se redujo a la mitad para que la página no se vea vacía.
- Margen lateral: `clamp(16px, 6vw, 88px)`.
- Ancho de contenido: 1264px como máximo.

## Forma y profundidad

- Radios: 12px (chips, miniaturas), 24px (tarjetas), 48px (borde superior de las hojas, 32px en móvil), píldora en botones.
- Sombra única, solo para maquetas flotantes: `0 24px 64px rgba(20,33,61,.18)`.
- Las hojas se montan sobre la anterior con el borde superior redondeado.

## Componentes

- **Botón primario:** píldora azul con texto blanco, 16px peso 550, 48px de alto. Hover `--color-primario-hover`. En zonas oscuras, naranja con texto `--color-tinta`. Desactivado al 40%.
- **Botón secundario:** píldora transparente con borde de 1px del color del texto. Hover con `--tinte`.
- **Botón discreto:** texto con subrayado.
- **Foco:** contorno de 2px del color del texto con 2px de separación, en todos los elementos interactivos.
- **Enlaces:** subrayados dentro del texto.
- **Navegación:** transparente sobre el hero, sólida en azul noche al hacer scroll y en las páginas internas, con la franja de marca debajo. Menús por clic, teclado y hover. En móvil, menú a pantalla completa.
- **Chips de selección:** píldora con borde; la elegida va en `--color-primario` con texto blanco.
- **Campos:** fondo blanco, borde `--color-borde-fuerte`, radio 12px, etiqueta siempre visible.
- **Tarjetas:** imagen arriba y texto debajo, sin borde; las destacadas van en `--color-seccion`.
- **Ficha de producto:** fondo `--color-blanco` con radio 24px, para las fotos sobre blanco.
- **Pie:** azul noche, con logo y cuatro columnas de enlaces, y una barra legal abajo.

## Imágenes e íconos

- Solo imágenes reales de Design Promo, copiadas a `assets/img` y optimizadas en JPEG.
- A pantalla completa: escenas de taller con velo azul noche para asegurar el contraste.
- Producto sobre blanco: siempre dentro de una ficha `--color-blanco`, nunca suelto sobre el fondo crema.
- No usar imágenes con personajes o marcas de terceros. Ya se descartaron o recortaron: apliques (Superman, Batman), mug con Cartman, busos con Bugs Bunny, botones (Coca-Cola, BMW, Burger King), portavasos (Angry Birds), llaveros (Duff, Starbucks), cintas (Facebook, L'Oréal) y gorras con KISS o The Beatles.
- Logo: `marca/logo-design-promo.png`, transparente, pensado para fondo oscuro. Solo va sobre azul noche: "DESIGN" y "PROMO" son blancos y se pierden sobre crema. No aplicarle filtros.
- Sello de fabricante: tiene fondo blanco, así que va como calcomanía con radio y sombra.
- Íconos: un solo set SVG en línea, trazo 1.8, extremos redondeados. Sin emojis.
- Videos del taller: reales, sin controles ni sonido y en bucle. Se reproducen solos mientras se ven, con `data-autoplay`, y llevan `poster` en `assets/img/escenas`.

## Movimiento

- Rotación del titular cada 3,2s con fundido de la imagen de fondo.
- Texto declarativo que se ilumina con el scroll: la oración activa se resalta como con marcador, con un color de la pirámide del logo (verde, amarillo, naranja y rojo, en ese orden), y al pasar conserva su color como texto.
- Carruseles continuos que se pausan con el puntero o el foco.
- Entradas al hacer scroll: 24px de desplazamiento y 0,6s, una sola vez.
- Parallax en los videos del fabricante: cada uno se mueve 24px en sentido contrario al otro, ligado al scroll.
- Con `prefers-reduced-motion` todo queda quieto y el contenido se ve completo.

## Honestidad del contenido

- Los testimonios del Inicio son ficticios, pedidos para ver cómo quedaría la página. Llevan el rótulo `.demo-tag` y el sitio tiene `noindex`.
- Antes de publicar el sitio hay que cambiarlos por reales o quitarlos.
- Sin cifras ni premios inventados: las cifras salen del sitio actual.
- Precios solo los publicados en octubre de 2026, con nota para confirmarlos.
