/*
 * Design Promo – comportamiento del sitio. Sin dependencias.
 * Cada bloque revisa si su sección existe, así el mismo archivo sirve para todas las páginas.
 */
(function () {
	'use strict';

	var root = document.documentElement;
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	var WA = 'https://wa.me/573133955378?text=';

	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

	// Centra un elemento dentro de su barra con scroll horizontal, sin mover la página.
	function centerInBar(el) {
		var bar = el.parentNode;
		var b = bar.getBoundingClientRect();
		var r = el.getBoundingClientRect();
		bar.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
	}

	/* Cabecera: sólida al hacer scroll ------------------------------------- */
	var header = $('[data-header]');
	var navEl = $('[data-nav]');
	var menuToggle = $('[data-menu-toggle]');
	var hasHero = !!$('[data-hero]');

	function updateHeader() {
		var open = navEl && navEl.classList.contains('is-open');
		header.classList.toggle('is-solid', open || !hasHero || window.scrollY > 24 || $$('.nav__panel:not([hidden])').length > 0);
	}
	window.addEventListener('scroll', updateHeader, { passive: true });
	updateHeader();

	/* Menús desplegables: clic, teclado y hover ---------------------------- */
	var menuButtons = $$('.nav__link[aria-controls]');
	var closeTimer = null;
	var isDesktop = window.matchMedia('(min-width: 1025px) and (hover: hover)');

	function setMenu(btn, open) {
		btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		$('#' + btn.getAttribute('aria-controls')).hidden = !open;
	}

	function closeMenus(except) {
		menuButtons.forEach(function (b) {
			if (b !== except) { setMenu(b, false); }
		});
		updateHeader();
	}

	menuButtons.forEach(function (btn) {
		var item = btn.parentNode;
		btn.addEventListener('click', function () {
			var willOpen = btn.getAttribute('aria-expanded') !== 'true';
			closeMenus(btn);
			setMenu(btn, willOpen);
			updateHeader();
		});
		item.addEventListener('mouseenter', function () {
			if (!isDesktop.matches) { return; }
			clearTimeout(closeTimer);
			closeMenus(btn);
			setMenu(btn, true);
			updateHeader();
		});
		item.addEventListener('mouseleave', function () {
			if (!isDesktop.matches) { return; }
			closeTimer = setTimeout(function () { closeMenus(); }, 160);
		});
		item.addEventListener('focusout', function (e) {
			if (isDesktop.matches && !item.contains(e.relatedTarget)) { setMenu(btn, false); updateHeader(); }
		});
	});

	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') { return; }
		var abierto = menuButtons.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
		closeMenus();
		if (abierto) { abierto.focus(); }
	});

	document.addEventListener('click', function (e) {
		if (!e.target.closest('.nav__item')) { closeMenus(); }
	});

	/* Menú móvil ----------------------------------------------------------- */
	function setMobile(open) {
		navEl.classList.toggle('is-open', open);
		menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
		document.body.style.overflow = open ? 'hidden' : '';
		updateHeader();
	}

	if (menuToggle) {
		menuToggle.addEventListener('click', function () {
			setMobile(!navEl.classList.contains('is-open'));
		});
		$$('a', navEl).forEach(function (a) {
			a.addEventListener('click', function () { setMobile(false); });
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && navEl.classList.contains('is-open')) {
				setMobile(false);
				menuToggle.focus();
			}
		});
	}

	/* Hero: titular rotativo con fundido de fondo -------------------------- */
	var hero = $('[data-hero]');
	var pauseBtn = $('[data-pause]');
	var paused = false;

	if (hero) {
		var slides = $$('.hero__slide', hero);
		var words = $$('.rotor__word', hero);
		var current = 0;
		var timer = null;
		var heroVisible = true;

		function showSlide(n) {
			var prev = current;
			slides[prev].classList.remove('is-active');
			words[prev].classList.remove('is-active');
			words[prev].classList.add('is-leaving');
			setTimeout(function () { words[prev].classList.remove('is-leaving'); }, 650);
			current = n;
			slides[n].classList.add('is-active');
			words[n].classList.add('is-active');
		}

		function stopHero() {
			clearInterval(timer);
			timer = null;
		}

		function startHero() {
			if (timer || paused || reduce.matches || !heroVisible || document.hidden) { return; }
			timer = setInterval(function () { showSlide((current + 1) % slides.length); }, 3200);
		}

		// Las demás escenas se cargan cuando la página ya terminó.
		function loadSlides() {
			$$('img[data-src]', hero).forEach(function (img) {
				img.src = img.getAttribute('data-src');
				img.removeAttribute('data-src');
			});
			startHero();
		}

		if (document.readyState === 'complete') {
			loadSlides();
		} else {
			window.addEventListener('load', loadSlides);
		}

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				heroVisible = entries[0].isIntersecting;
				if (heroVisible) { startHero(); } else { stopHero(); }
			}, { threshold: 0.2 }).observe(hero);
		}

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) { stopHero(); } else { startHero(); }
		});

		// Un solo botón pausa el titular y todos los carruseles.
		if (pauseBtn) {
			pauseBtn.addEventListener('click', function () {
				paused = !paused;
				root.classList.toggle('is-paused', paused);
				pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
				pauseBtn.setAttribute('aria-label', paused ? 'Reanudar animaciones' : 'Pausar animaciones');
				if (paused) { stopHero(); } else { startHero(); }
			});
		}
	}

	/* Frase que se ilumina por partes -------------------------------------- */
	var statement = $('[data-statement]');

	if (statement && !reduce.matches) {
		var parts = $$('span', statement);
		var ticking = false;

		function paintStatement() {
			ticking = false;
			var r = statement.getBoundingClientRect();
			var vh = window.innerHeight;
			var p = (vh * 0.86 - r.top) / (r.height + vh * 0.62);
			var active = Math.min(parts.length - 1, Math.max(0, Math.floor(p * parts.length)));
			parts.forEach(function (el, i) {
				el.setAttribute('data-state', i === active ? 'on' : (i < active ? 'past' : 'next'));
			});
		}

		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(paintStatement);
			}
		}, { passive: true });
		paintStatement();
	}

	/* Carruseles continuos: la copia hace que el bucle no tenga saltos ------ */
	$$('[data-marquee] .marquee__track').forEach(function (track) {
		var copy = track.firstElementChild.cloneNode(true);
		copy.setAttribute('aria-hidden', 'true');
		$$('a', copy).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
		$$('img', copy).forEach(function (img) { img.alt = ''; });
		track.appendChild(copy);
	});

	$$('[data-thumbs] .thumbs__row').forEach(function (row) {
		$$('img', row).forEach(function (img) { row.appendChild(img.cloneNode(true)); });
	});

	/* Entradas al hacer scroll --------------------------------------------- */
	var reveals = $$('.section__head, .quote, .flex-cards, .tech, .audience, .biz, .quotes, .prices, .maker, .ship, .steps');

	if ('IntersectionObserver' in window && !reduce.matches) {
		var revealObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					revealObserver.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px' });

		reveals.forEach(function (el) {
			el.classList.add('reveal');
			revealObserver.observe(el);
		});
	}

	/* Cotizador: arma el mensaje y deja el enlace de WhatsApp listo --------- */
	$$('[data-quote]').forEach(function (form) {
		var preview = $('[data-quote-preview]', form.closest('.quote'));
		var send = $('[data-quote-send]', form);
		var status = $('[data-quote-status]', form);
		var techField = $('[data-quote-tecnica]', form);
		var techInputs = $$('input[name="tecnica"]', form);
		var prodInputs = $$('input[name="producto"]', form);
		var otro = $('[data-quote-otro]', form);
		var initialNote = status.textContent;

		function pick(name) {
			var el = $('input[name="' + name + '"]:checked', form);
			return el ? el.value : '';
		}

		function syncTecnicas() {
			var prod = $('input[name="producto"]:checked', form);
			var solo = prod && prod.getAttribute('data-solo');
			techField.hidden = !!prod && prod.hasAttribute('data-sin-tecnica');
			techInputs.forEach(function (input) {
				input.disabled = !!solo && input.value !== '' && input.value !== solo;
				if (input.disabled && input.checked) { techInputs[0].checked = true; }
			});
		}

		function buildMessage() {
			var nombre = form.elements.nombre.value.trim();
			var cantidad = pick('cantidad').toLowerCase();
			var tecnica = pick('tecnica');
			var msg = 'Hola, quisiera cotizar ' + (pick('producto') || otro.value.trim()) + '.';

			msg += ' Serían ' + (cantidad.indexOf('o más') > -1 ? cantidad : 'de ' + cantidad) + ' unidades';
			if (techField.hidden) {
				msg += '.';
			} else if (tecnica) {
				msg += ' con ' + tecnica.toLowerCase() + '.';
			} else {
				msg += ' y quisiera que me asesoren con la técnica.';
			}
			if (nombre) { msg += ' Mi nombre o empresa: ' + nombre + '.'; }
			return msg;
		}

		function update() {
			syncTecnicas();
			var msg = buildMessage();
			if (preview) { preview.textContent = msg; }
			send.href = WA + encodeURIComponent(msg);
			status.textContent = initialNote;
			status.classList.remove('is-sent');
		}

		/* Escribir un producto desmarca las opciones; elegir una borra lo escrito. */
		otro.addEventListener('input', function () {
			var escrito = otro.value.trim() !== '';
			prodInputs.forEach(function (input, i) { input.checked = !escrito && i === 0; });
		});
		prodInputs.forEach(function (input) {
			input.addEventListener('change', function () { otro.value = ''; });
		});

		form.addEventListener('input', update);
		form.addEventListener('change', update);
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			send.click();
		});
		send.addEventListener('click', function () {
			status.textContent = 'Listo. Revisa WhatsApp y envía tu mensaje.';
			status.classList.add('is-sent');
		});
		update();
	});

	/* Tarjetas que se ensanchan -------------------------------------------- */
	$$('[data-flexcards]').forEach(function (wrap) {
		var cards = $$('.flex-card', wrap);
		function activate(card) {
			cards.forEach(function (c) { c.classList.toggle('is-active', c === card); });
		}
		cards.forEach(function (card) {
			card.addEventListener('mouseenter', function () { activate(card); });
			card.addEventListener('focusin', function () { activate(card); });
		});
	});

	/* Videos: solo corren mientras se ven ---------------------------------- */
	$$('video[data-autoplay]').forEach(function (video) {
		if (reduce.matches || !('IntersectionObserver' in window)) { return; }
		new IntersectionObserver(function (entries) {
			if (entries[0].isIntersecting) { video.play().catch(function () {}); }
			else { video.pause(); }
		}).observe(video);
	});

	/* Pestañas de técnicas ------------------------------------------------- */
	$$('[data-tabs]').forEach(function (wrap) {
		var tabs = $$('[role="tab"]', wrap);

		function select(tab, focus) {
			tabs.forEach(function (t) {
				var on = t === tab;
				t.setAttribute('aria-selected', on ? 'true' : 'false');
				t.tabIndex = on ? 0 : -1;
				$('#' + t.getAttribute('aria-controls')).hidden = !on;
			});
			if (focus) { tab.focus({ preventScroll: true }); }
			centerInBar(tab);
		}

		tabs.forEach(function (tab, i) {
			tab.addEventListener('click', function () { select(tab, false); });
			tab.addEventListener('keydown', function (e) {
				var next = null;
				if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { next = tabs[(i + 1) % tabs.length]; }
				if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
				if (e.key === 'Home') { next = tabs[0]; }
				if (e.key === 'End') { next = tabs[tabs.length - 1]; }
				if (next) {
					e.preventDefault();
					select(next, true);
				}
			});
		});
	});

	/* Carnet: frente y reverso --------------------------------------------- */
	var flip = $('[data-carnet-flip]');

	if (flip) {
		flip.addEventListener('click', function () {
			var on = $('[data-carnet]').classList.toggle('is-flipped');
			flip.setAttribute('aria-pressed', on ? 'true' : 'false');
			flip.textContent = on ? 'Ver frente' : 'Ver reverso';
		});
	}

	/* Testimonios ---------------------------------------------------------- */
	var quotes = $('[data-quotes]');

	if (quotes) {
		var prev = $('[data-quotes-prev]');
		var next = $('[data-quotes-next]');
		var step = function () { return quotes.firstElementChild.getBoundingClientRect().width + 20; };

		function syncQuotes() {
			prev.disabled = quotes.scrollLeft < 8;
			next.disabled = quotes.scrollLeft + quotes.clientWidth > quotes.scrollWidth - 8;
		}

		prev.addEventListener('click', function () { quotes.scrollBy({ left: -step() }); });
		next.addEventListener('click', function () { quotes.scrollBy({ left: step() }); });
		quotes.addEventListener('scroll', syncQuotes, { passive: true });
		window.addEventListener('resize', syncQuotes);
		syncQuotes();
	}

	/* Pasos: uno abierto a la vez y cambia la imagen ------------------------ */
	$$('[data-steps]').forEach(function (wrap) {
		var items = $$('.step', wrap);
		var images = $$('.steps__media img', wrap);

		items.forEach(function (item, i) {
			$('button', item).addEventListener('click', function () {
				items.forEach(function (it, k) {
					var on = k === i;
					it.classList.toggle('is-open', on);
					$('button', it).setAttribute('aria-expanded', on ? 'true' : 'false');
					if (images[k]) { images[k].classList.toggle('is-active', on); }
				});
			});
		});
	});

	/* Catálogo: filtro por categoría y búsqueda ----------------------------- */
	var catalog = $('[data-catalog]');

	if (catalog) {
		var groups = $$('[data-group]', catalog);
		var chips = $$('[data-filter]');
		var search = $('[data-search]');
		var empty = $('[data-empty]');
		var count = $('[data-count]');
		var soloDisponibles = $('[data-disponibles]');

		function normalize(s) {
			return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
		}

		function applyFilter(id, scroll) {
			var q = search ? normalize(search.value.trim()) : '';
			var total = 0;

			groups.forEach(function (group) {
				var matchGroup = id === 'todo' || group.getAttribute('data-group') === id;
				var visibles = 0;
				$$('.pcard', group).forEach(function (card) {
					var ok = matchGroup && (!q || normalize(card.getAttribute('data-name')).indexOf(q) > -1);
					if (ok && soloDisponibles && soloDisponibles.checked && card.hasAttribute('data-agotado')) { ok = false; }
					card.hidden = !ok;
					if (ok) { visibles++; }
				});
				group.hidden = visibles === 0;
				total += visibles;
			});

			chips.forEach(function (chip) {
				var on = chip.getAttribute('data-filter') === id;
				if (on) {
					chip.setAttribute('aria-current', 'true');
					centerInBar(chip);
				} else {
					chip.removeAttribute('aria-current');
				}
			});

			if (empty) { empty.hidden = total > 0; }
			if (count) { count.textContent = total + (total === 1 ? ' producto' : ' productos'); }
			if (scroll) { catalog.scrollIntoView({ block: 'start' }); }
		}

		function currentId() {
			var el = chips.filter(function (c) { return c.hasAttribute('aria-current'); })[0];
			return el ? el.getAttribute('data-filter') : 'todo';
		}

		chips.forEach(function (chip) {
			chip.addEventListener('click', function (e) {
				e.preventDefault();
				var id = chip.getAttribute('data-filter');
				history.replaceState(null, '', id === 'todo' ? location.pathname : '#' + id);
				applyFilter(id, true);
			});
		});

		if (search) {
			search.addEventListener('input', function () { applyFilter(currentId(), false); });
		}
		if (soloDisponibles) {
			soloDisponibles.addEventListener('change', function () { applyFilter(currentId(), false); });
		}

		function fromHash() {
			var id = location.hash.replace('#', '');
			var valid = chips.some(function (c) { return c.getAttribute('data-filter') === id; });
			applyFilter(valid ? id : 'todo', false);
		}

		window.addEventListener('hashchange', fromHash);
		fromHash();
	}
})();
