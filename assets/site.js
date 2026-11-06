(() => {
  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // Mobile navigation: accessible state, Escape and outside-click handling.
  const menuButton = one('.menu-toggle');
  const navigation = one('.nav');
  const setMenu = (open) => {
    if (!menuButton || !navigation) return;
    navigation.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', open);
  };
  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    all('a', navigation).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
    document.addEventListener('pointerdown', event => {
      if (!navigation.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
    });
  }

  // Scroll progress, deliberately subtle and passive.
  const progress = one('[data-scroll-progress]');
  if (progress) {
    let progressFrame = 0;
    const paintProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      progressFrame = 0;
    };
    window.addEventListener('scroll', () => {
      if (!progressFrame) progressFrame = requestAnimationFrame(paintProgress);
    }, { passive: true });
    paintProgress();
  }

  // Archive filters with live result count and accessible announcements.
  const filterButtons = all('.filter-btn');
  const projectCards = all('[data-category]');
  const filterStatus = one('[data-filter-status]');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter || 'all';
    let visible = 0;
    filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    projectCards.forEach(card => {
      const show = category === 'all' || card.dataset.category === category;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (filterStatus) filterStatus.textContent = visible + (visible > 1 ? ' projets affichés' : ' projet affiché');
  }));

  // Scroll reveal: visible by default if IntersectionObserver is unavailable.
  const revealItems = all('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-visible'));

  // Pointer parallax is limited to the hero sculpture and fine pointers.
  const stage = one('[data-parallax]');
  const stageObject = one('.hero-stage-object');
  if (stage && stageObject && finePointer && !reduceMotion) {
    let frame = 0;
    let x = 0, y = 0;
    stage.addEventListener('pointermove', event => {
      const rect = stage.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - 0.5;
      y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(() => {
        stageObject.style.transform = 'rotate(' + (-6 + x * 4) + 'deg) translate3d(' + (x * 13) + 'px,' + (y * 13) + 'px,0) scale(1.015)';
        frame = 0;
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { stageObject.style.transform = ''; });
  }

  // Magnetic micro-interactions, plural selector bug fixed.
  all('[data-magnetic]').forEach(element => {
    if (!finePointer || reduceMotion) return;
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      element.style.transform = 'translate(' + (x * 5) + 'px,' + (y * 4) + 'px)';
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });

  // Material laboratory controls.
  const materialStage = one('[data-material-stage]');
  const materialButtons = all('[data-material]');
  const materialName = one('[data-material-name]');
  const materialDescription = one('[data-material-description]');
  const materialCopy = {
    glass: ['Optical glass', 'Une surface presque invisible. La lumière révèle ses contours.'],
    liquid: ['Liquid metal', 'Une matière dense, mobile, parcourue de reflets froids.'],
    veil: ['Soft veil', 'Des couches souples, diffuses, suspendues dans l’espace.']
  };
  materialButtons.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.material;
    if (!materialCopy[key] || !materialStage) return;
    materialStage.dataset.materialStage = key;
    materialButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    if (materialName) materialName.textContent = materialCopy[key][0];
    if (materialDescription) materialDescription.textContent = materialCopy[key][1];
  }));

  // Contact brief: no fake submission. Everything stays in the browser until
  // an actual delivery channel is configured.
  const briefForm = one('[data-brief-form]');
  const briefStatus = one('[data-brief-status]');
  if (briefForm) {
    briefForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!briefForm.reportValidity()) return;
      const data = new FormData(briefForm);
      const lines = [
        'DEMANDE DE PROJET — ORBE & ONIX',
        'Nom : ' + (data.get('name') || ''),
        'Email : ' + (data.get('email') || ''),
        'Organisation : ' + (data.get('company') || 'Non précisée'),
        'Type de projet : ' + (data.get('project') || ''),
        'Budget indicatif : ' + (data.get('budget') || 'À discuter'),
        '',
        'Description :',
        data.get('message') || ''
      ];
      const brief = lines.join('\n');
      try {
        await navigator.clipboard.writeText(brief);
        if (briefStatus) briefStatus.textContent = 'Brief copié. Vous pouvez maintenant le coller dans votre application de messagerie.';
      } catch {
        const fallback = one('[data-brief-output]');
        if (fallback) {
          fallback.hidden = false;
          fallback.value = brief;
          fallback.focus();
          fallback.select();
        }
        if (briefStatus) briefStatus.textContent = 'Sélectionnez et copiez le brief affiché ci-dessous.';
      }
    });
  }

  // Dynamic case-study copy and artwork.
  const projectData = {
    'naya-house': {
      name: 'NAYA HOUSE',
      type: 'Hospitality / Website concept',
      intro: 'Une expérience digitale imaginée pour une adresse hôtelière contemporaine. Le concept explore une navigation calme, une hiérarchie éditoriale généreuse et une présentation immersive des espaces.',
      goal: 'Présenter un lieu et faciliter la prise de contact',
      scope: 'Direction artistique, UX, interface responsive',
      status: 'Concept indépendant',
      art: 'assets/project-naya.svg',
      discipline: 'Hospitality'
    },
    'forme': {
      name: 'FORME',
      type: 'Commerce / E-commerce concept',
      intro: 'Une boutique de décoration conçue autour de la matière, de la lumière et d’un catalogue lisible. Le concept propose une expérience produit minimaliste et tactile.',
      goal: 'Valoriser une collection et son univers',
      scope: 'Direction artistique, parcours boutique, UI',
      status: 'Concept indépendant',
      art: 'assets/project-forme.svg',
      discipline: 'Commerce'
    },
    'flowstate': {
      name: 'FLOWSTATE',
      type: 'Digital product / Application concept',
      intro: 'Un tableau de bord imaginé pour rendre le suivi de projets plus clair. Le concept explore la visualisation des tâches, les états et la densité d’information.',
      goal: 'Clarifier le suivi des projets',
      scope: 'Architecture d’information, UX, interface',
      status: 'Concept indépendant',
      art: 'assets/project-flowstate.svg',
      discipline: 'Digital product'
    }
  };
  const caseName = one('#case-name');
  if (caseName) {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('ref') || 'naya-house';
    const data = projectData[key] || projectData['naya-house'];
    caseName.textContent = data.name;
    const fields = {
      '#case-type': data.type, '#case-intro': data.intro, '#case-goal': data.goal,
      '#case-scope': data.scope, '#case-status': data.status, '#case-discipline': data.discipline
    };
    Object.entries(fields).forEach(([selector, value]) => {
      const node = one(selector); if (node) node.textContent = value;
    });
    const art = one('#case-art');
    if (art) { art.src = data.art; art.alt = 'Illustration vectorielle du concept ' + data.name; }
    document.title = data.name + ' — ORBE & ONIX';
  }

  all('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
})();