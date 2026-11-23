(function () {
	'use strict';

	var PHOTOSWIPE_URL = 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/';
	var DEFAULT_LANG = 'en';

	var root = document.documentElement;
	var currentLang = DEFAULT_LANG;
	var lightbox = null;

	// ---------- Storage helpers (localStorage may be unavailable) ----------

	function readStorage(key) {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			return null;
		}
	}

	function writeStorage(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			// Ignore: the choice just will not be remembered
		}
	}

	function applyTheme(theme) {
		// Bulma 1.x switches palettes via the data-theme attribute
		root.setAttribute('data-theme', theme);

		// Keep the switch in sync with the active theme
		document.getElementById('theme-toggle').checked = theme === 'dark';
	}

	function initTheme() {
		var toggle = document.getElementById('theme-toggle');
		var saved = readStorage('theme');
		var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		applyTheme(saved || (prefersDark ? 'dark' : 'light'));

		toggle.addEventListener('change', function () {
			var next = toggle.checked ? 'dark' : 'light';

			applyTheme(next);
			writeStorage('theme', next);
		});
	}

	// ---------- Translations ----------

	function t(key) {
		var dictionary = window.I18N[currentLang] || {};

		return dictionary[key] !== undefined ? dictionary[key] : key;
	}

	function updatePhotoBadges() {
		document.querySelectorAll('.project-gallery').forEach(function (gallery) {
			var badge = gallery.querySelector('.photo-badge');
			var extra = gallery.querySelectorAll('a').length - 1;

			badge.textContent = extra > 0 ? t('gallery.more').replace('{count}', extra) : '';
		});
	}

	function updateLightboxLabels() {
		if (!lightbox) {
			return;
		}

		lightbox.options.closeTitle = t('pswp.close');
		lightbox.options.zoomTitle = t('pswp.zoom');
		lightbox.options.arrowPrevTitle = t('pswp.prev');
		lightbox.options.arrowNextTitle = t('pswp.next');
		lightbox.options.errorMsg = t('pswp.error');
	}

	function applyLanguage(lang) {
		currentLang = window.I18N[lang] ? lang : DEFAULT_LANG;

		root.lang = currentLang;
		document.title = t('meta.title');

		document.querySelectorAll('[data-i18n]').forEach(function (element) {
			element.textContent = t(element.getAttribute('data-i18n'));
		});

		document.querySelectorAll('[data-i18n-alt]').forEach(function (element) {
			element.alt = t(element.getAttribute('data-i18n-alt'));
		});

		document.querySelectorAll('[data-i18n-aria]').forEach(function (element) {
			element.setAttribute('aria-label', t(element.getAttribute('data-i18n-aria')));
		});

		// The button shows the language you will switch to
		document.getElementById('lang-toggle').textContent = t('lang.switchTo');

		updatePhotoBadges();
		updateLightboxLabels();
	}

	function initLanguage() {
		var saved = readStorage('lang');
		var browserLang = (navigator.language || '').slice(0, 2);

		applyLanguage(saved || (browserLang === 'ru' ? 'ru' : DEFAULT_LANG));

		document.getElementById('lang-toggle').addEventListener('click', function () {
			var next = currentLang === 'en' ? 'ru' : 'en';

			applyLanguage(next);
			writeStorage('lang', next);
		});
	}

	// ---------- Navbar burger ----------

	function initBurger() {
		var burger = document.querySelector('.navbar-burger');
		var menu = document.getElementById(burger.getAttribute('data-target'));

		function setOpen(isOpen) {
			burger.classList.toggle('is-active', isOpen);
			menu.classList.toggle('is-active', isOpen);
			burger.setAttribute('aria-expanded', isOpen);
		}

		burger.addEventListener('click', function () {
			setOpen(!burger.classList.contains('is-active'));
		});

		// Close the menu after choosing a link on mobile
		menu.querySelectorAll('a.navbar-item').forEach(function (link) {
			link.addEventListener('click', function () {
				setOpen(false);
			});
		});
	}

	// ---------- Scroll progress bar ----------

	function initScrollProgress() {
		var bar = document.getElementById('scroll-progress-bar');

		function update() {
			var scrollable = document.documentElement.scrollHeight - window.innerHeight;
			var progress = scrollable > 0 ? window.scrollY / scrollable : 0;

			bar.style.transform = 'scaleX(' + Math.min(Math.max(progress, 0), 1) + ')';
		}

		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();
	}

	/**
	 * Every .project-gallery is a separate gallery. Only the first link is
	 * visible, the other ones are hidden but still open in the lightbox.
	 * PhotoSwipe is an ES module, so it is loaded with dynamic import(),
	 * which also works when index.html is opened from the disk.
	 */
	function initGallery() {
		import(PHOTOSWIPE_URL + 'photoswipe-lightbox.esm.min.js')
			.then(function (module) {
				var PhotoSwipeLightbox = module.default;

				lightbox = new PhotoSwipeLightbox({
					gallery: '.project-gallery',
					children: 'a',
					paddingFn: function (viewportSize) {
						if (viewportSize.x < 769) {
							return { top: 48, bottom: 24, left: 8, right: 8 };
						}

						return { top: 60, bottom: 60, left: 80, right: 80 };
					},
					pswpModule: function () {
						return import(PHOTOSWIPE_URL + 'photoswipe.esm.min.js');
					}
				});

				updateLightboxLabels();
				lightbox.init();
			})
			.catch(function (error) {
				console.error('PhotoSwipe failed to load:', error);
			});
	}

	/**
	 * Collects the tags from all projects and builds one cloud.
	 * The more projects use a technology, the bigger its tag is.
	 */
	function initTechCloud() {
		var section = document.getElementById('tech-cloud');
		var container = document.getElementById('tech-cloud-tags');
		var counts = {};

		document.querySelectorAll('.project-tags .tag').forEach(function (tag) {
			var name = tag.textContent.trim();
			var key = name.toLowerCase();

			if (!name) {
				return;
			}

			if (!counts[key]) {
				counts[key] = { name: name, count: 0 };
			}

			counts[key].count += 1;
		});

		var items = Object.keys(counts).map(function (key) {
			return counts[key];
		});

		if (!items.length) {
			return;
		}

		// Most popular first, then alphabetically
		items.sort(function (a, b) {
			return b.count - a.count || a.name.localeCompare(b.name);
		});

		var max = items[0].count;

		items.forEach(function (item) {
			var group = document.createElement('div');
			var label = document.createElement('span');
			var number = document.createElement('span');
			var size = 'is-normal';

			if (max > 1 && item.count === max) {
				size = 'is-large';
			} else if (item.count > 1) {
				size = 'is-medium';
			}

			group.className = 'tags has-addons';

			label.className = 'tag is-link is-light ' + size;
			label.textContent = item.name;

			number.className = 'tag is-link ' + size;
			number.textContent = item.count;

			group.appendChild(label);
			group.appendChild(number);
			container.appendChild(group);
		});

		section.hidden = false;
	}

	// ---------- Start ----------

	document.getElementById('year').textContent = new Date().getFullYear();

	initTheme();
	initLanguage();
	initBurger();
	initGallery();
	initScrollProgress();
	initTechCloud();
})();
