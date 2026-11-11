(() => {
  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('.main-nav');
  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!menuButton || menuButton.getAttribute('aria-expanded') !== 'true') return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
    nav?.classList.remove('open');
    if (restoreFocus) menuButton.focus();
  };

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? 'Ouvrir la navigation' : 'Fermer la navigation');
    nav?.classList.toggle('open', !open);
    if (!open) nav?.querySelector('a')?.focus({ preventScroll: true });
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('pointerdown', event => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
    if (!nav?.contains(event.target) && !menuButton?.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
  });
  const desktopQuery = window.matchMedia('(min-width: 781px)');
  desktopQuery.addEventListener?.('change', event => { if (event.matches) closeMenu(); });

  const rail = document.querySelector('.chapter-rail');
  const railLinks = [...document.querySelectorAll('[data-chapter]')];
  const progress = document.querySelector('[data-progress]');
  const chapters = railLinks.map(link => document.getElementById(link.dataset.chapter)).filter(Boolean);

  const setActiveChapter = id => {
    railLinks.forEach(link => {
      const active = link.dataset.chapter === id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  if (location.hash) {
    const initialId = location.hash.slice(1);
    if (railLinks.some(link => link.dataset.chapter === initialId)) setActiveChapter(initialId);
  }

  let scrollFrame = 0;
  const updateRail = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const y = window.scrollY;
      rail?.classList.toggle('visible', y > window.innerHeight * .55);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.height = (max > 0 ? Math.min(100, y / max * 100) : 0) + '%';
    });
  };
  updateRail();
  window.addEventListener('scroll', updateRail, { passive: true });
  window.addEventListener('resize', updateRail, { passive: true });

  if ('IntersectionObserver' in window) {
    const chapterObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveChapter(visible.target.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .1, .25, .5] });
    chapters.forEach(chapter => chapterObserver.observe(chapter));
  }

  const revealItems = document.querySelectorAll(
    '.opening-copy,.opening-image,.chapter-intro>*,.stay-heading,.room,.daybook-heading,.daybook-spread,.coast-title,.coast-panorama,.coast-notes>div,.letter-layout>*'
  );
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    }), { threshold: .1, rootMargin: '0px 0px -25px 0px' });
    revealItems.forEach(item => {
      item.classList.add('reveal');
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(item => item.classList.add('in-view'));
  }

  const moments = {
    morning: {
      title: 'Le jour s’installe.',
      copy: 'La maison s’éveille doucement. Le café refroidit un peu, personne ne regarde l’heure.',
      caption: '04.02 / LE MATIN',
      image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1500&q=85',
      alt: 'Lumière dorée du matin sur un paysage calme'
    },
    afternoon: {
      title: 'L’après-midi s’étire.',
      copy: 'L’ombre gagne le jardin. On lit quelques pages, on ferme les yeux, on laisse passer la chaleur.',
      caption: '04.03 / L’APRÈS-MIDI',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1500&q=85',
      alt: 'Intérieur paisible dans la lumière de l’après-midi'
    },
    evening: {
      title: 'La lumière se retire.',
      copy: 'Le ciel change de couleur. La conversation ralentit. Le soir arrive sans qu’on l’ait attendu.',
      caption: '04.04 / LE SOIR',
      image: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1500&q=85',
      alt: 'Ciel du soir et lumière de fin de journée'
    }
  };

  const timeTabs = [...document.querySelectorAll('[data-time]')];
  const timeImage = document.querySelector('[data-time-image]');
  const selectMoment = button => {
    const moment = moments[button.dataset.time];
    if (!moment) return;
    timeTabs.forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    const title = document.querySelector('[data-time-title]');
    const copy = document.querySelector('[data-time-copy]');
    const caption = document.querySelector('[data-time-caption]');
    if (title) title.textContent = moment.title;
    if (copy) copy.textContent = moment.copy;
    if (caption) caption.textContent = moment.caption;
    if (timeImage) {
      timeImage.style.opacity = '.35';
      const nextImage = new Image();
      nextImage.onload = () => {
        timeImage.src = moment.image;
        timeImage.alt = moment.alt;
        timeImage.style.opacity = '1';
      };
      nextImage.onerror = () => { timeImage.style.opacity = '1'; };
      nextImage.src = moment.image;
    }
  };
  timeTabs.forEach((button, index) => {
    button.addEventListener('click', () => selectMoment(button));
    button.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % timeTabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + timeTabs.length) % timeTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = timeTabs.length - 1;
      else return;
      event.preventDefault();
      timeTabs[next].focus();
      selectMoment(timeTabs[next]);
    });
  });

  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  const lightboxCaption = document.querySelector('[data-lightbox-caption]');
  const closeLightboxButton = document.querySelector('[data-lightbox-close]');
  let lastTrigger = null;

  const hideLightbox = () => {
    if (!lightbox?.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    if (lightboxImage) lightboxImage.removeAttribute('src');
    lastTrigger?.focus();
  };

  const openLightbox = trigger => {
    if (!lightbox || !lightboxImage) return;
    const source = trigger.querySelector('img');
    if (!source) return;
    lastTrigger = trigger;
    lightboxImage.src = source.currentSrc || source.src;
    lightboxImage.alt = source.alt;
    if (lightboxCaption) lightboxCaption.textContent = source.alt;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    closeLightboxButton?.focus();
  };

  document.querySelectorAll('.opening-image,.house-image,.room-photo,.time-image,.coast-panorama').forEach(figure => {
    figure.setAttribute('role', 'button');
    figure.setAttribute('tabindex', '0');
    figure.setAttribute('aria-label', 'Agrandir la photographie');
    figure.setAttribute('aria-haspopup', 'dialog');
    figure.setAttribute('aria-controls', 'naya-lightbox');
    figure.addEventListener('click', () => openLightbox(figure));
    figure.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(figure);
      }
    });
  });

  closeLightboxButton?.addEventListener('click', hideLightbox);
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) hideLightbox(); });
  document.addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hideLightbox();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      closeLightboxButton?.focus();
    }
  });

  const form = document.querySelector('[data-stay-form]');
  const feedback = document.querySelector('[data-feedback]');
  const arrival = form?.elements.namedItem('arrival');
  const departure = form?.elements.namedItem('departure');

  if (arrival && departure) {
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    arrival.min = today;
    departure.min = today;

    const validateDates = () => {
      const invalid = Boolean(arrival.value && departure.value && departure.value <= arrival.value);
      departure.setCustomValidity(invalid ? 'La date de départ doit être postérieure à la date d’arrivée.' : '');
      departure.setAttribute('aria-invalid', String(invalid));
      return !invalid;
    };

    arrival.addEventListener('change', () => {
      departure.min = arrival.value || today;
      validateDates();
    });
    departure.addEventListener('change', validateDates);

    form?.addEventListener('reset', () => {
      window.setTimeout(() => {
        departure.min = today;
        departure.setCustomValidity('');
        departure.removeAttribute('aria-invalid');
      }, 0);
    });

    form?.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!validateDates()) {
        feedback.textContent = 'La date de départ doit être postérieure à la date d’arrivée.';
        departure.focus();
        departure.reportValidity();
        return;
      }
      if (feedback) feedback.textContent = 'Les informations sont cohérentes. Cette maquette ne transmet pas encore les demandes : aucune réservation n’a été envoyée.';
    });
  }

  document.querySelectorAll('[data-year]').forEach(node => {
    node.textContent = new Date().getFullYear();
  });
})();