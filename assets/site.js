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

  // Approved homepage hero: reveal content once without hiding it when JavaScript is unavailable.
  const homeHero = one('[data-hero-intro]');
  if (homeHero) {
    if (reduceMotion) {
      homeHero.classList.add('hero-motion-in');
    } else {
      homeHero.classList.add('hero-motion-ready');
      requestAnimationFrame(() => requestAnimationFrame(() => homeHero.classList.add('hero-motion-in')));
    }
  }

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
  const stageObject = one('.hero-stage-object-wrap') || one('.hero-stage-object');
  if (stage && stageObject && finePointer && !reduceMotion) {
    let frame = 0;
    let x = 0, y = 0;
    stage.addEventListener('pointermove', event => {
      const rect = stage.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - 0.5;
      y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(() => {
        stageObject.style.setProperty('--hero-pointer-x', (x * 14).toFixed(1) + 'px');
        stageObject.style.setProperty('--hero-pointer-y', (y * 14).toFixed(1) + 'px');
        frame = 0;
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      stageObject.style.setProperty('--hero-pointer-x', '0px');
      stageObject.style.setProperty('--hero-pointer-y', '0px');
    });
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

  // Dynamic editorial case studies: each project has its own narrative and visual language.
  const projectData = {
    'naya-house': {
      name:'NAYA HOUSE', number:'001', type:'HOSPITALITÉ / CONCEPT DE SITE WEB',
      lede:'Une adresse à ressentir avant même d’y arriver.',
      discipline:'Hospitalité / Expérience numérique',
      scopeShort:'Direction artistique · UX · UI responsive',
      intro:'NAYA HOUSE imagine l’expérience numérique d’un refuge côtier contemporain. Le concept place l’atmosphère au premier plan : lumière chaude, horizons ouverts et rythme éditorial apaisé.',
      headline:'Concevoir une première impression qui donne envie de ralentir.',
      questionTitle:'Comment faire ressentir un lieu à travers un écran ?',
      question:'Le défi consiste à transmettre une atmosphère sans encombrer l’interface, puis à guider naturellement vers les informations utiles et la prise de contact.',
      responseTitle:'Une direction qui laisse respirer le contenu.',
      response:'Une composition éditoriale généreuse, des images au premier plan et une navigation courte donnent au lieu le rôle principal.',
      p1t:'L’espace avant l’information.',p1:'Une hiérarchie claire laisse le visiteur découvrir le lieu avant de parcourir les détails pratiques.',
      p2t:'Une palette inspirée du paysage.',p2:'Des tons minéraux et solaires prolongent l’identité côtière sans transformer l’interface en décor.',
      p3t:'Le mouvement avec mesure.',p3:'Des transitions discrètes accompagnent la découverte et préservent une sensation de calme.',
      scopeIntro:'Le concept explore le parcours d’un visiteur, de la découverte de l’adresse à la préparation d’un séjour.',
      scope:['Architecture éditoriale et hiérarchie','Direction artistique & UI','Parcours responsive','Principes de réservation et contact'],
      honesty:'Concept indépendant. Aucun établissement réel, système de réservation opérationnel ou résultat commercial n’est revendiqué.',
      art:'assets/project-naya.svg', next:'forme', nextName:'FORME', nextType:'Commerce / Concept e-commerce', nextNumber:'002',
      artKicker:'NAYA HOUSE / COASTAL RETREAT'
    },
    'forme': {
      name:'FORME', number:'002', type:'COMMERCE / CONCEPT E-COMMERCE',
      lede:'Des objets du quotidien, traités comme des pièces de collection.',
      discipline:'Commerce / Expérience e-commerce',
      scopeShort:'Catalogue · Fiches produit · Panier',
      intro:'FORME est une boutique conceptuelle dédiée aux objets et à la décoration. L’exploration cherche l’équilibre entre une direction artistique affirmée, une découverte produit tactile et un parcours d’achat sans friction.',
      headline:'Donner au produit l’espace qu’il mérite.',
      questionTitle:'Comment rendre une boutique mémorable sans ralentir l’achat ?',
      question:'Le visiteur doit pouvoir ressentir l’univers de la marque, comprendre les objets et accéder rapidement aux informations essentielles.',
      responseTitle:'Une vitrine éditoriale, un parcours direct.',
      response:'La mise en page s’inspire des catalogues et des galeries : peu d’éléments, une typographie expressive et des fiches produit structurées.',
      p1t:'Le produit comme image centrale.',p1:'Les compositions donnent de la présence aux objets et clarifient les proportions, les matières et les usages.',
      p2t:'Une identité sobre et tactile.',p2:'Un système typographique contrasté et des tons naturels soutiennent une perception contemporaine.',
      p3t:'Une progression sans détour.',p3:'Catégories, découverte, fiche produit et panier forment un chemin lisible et cohérent.',
      scopeIntro:'L’étude se concentre sur les premières étapes d’une expérience e-commerce, de la vitrine à la compréhension du produit.',
      scope:['Structure de catalogue et catégories','Direction artistique & UI produit','Parcours de découverte responsive','Principes de panier et conversion'],
      honesty:'Concept indépendant. Les produits, la marque et le parcours d’achat sont fictifs : aucune boutique ou transaction réelle n’est proposée.',
      art:'assets/project-forme.svg', next:'flowstate', nextName:'FLOWSTATE', nextType:'Produit numérique / Concept d’application', nextNumber:'003',
      artKicker:'FORME / OBJECTS FOR LIVING'
    },
    'flowstate': {
      name:'FLOWSTATE', number:'003', type:'PRODUIT NUMÉRIQUE / CONCEPT D’APPLICATION',
      lede:'Moins de bruit. Une meilleure lecture du travail.',
      discipline:'Produit numérique / Interface de productivité',
      scopeShort:'Architecture · Tableau de bord · États UI',
      intro:'FLOWSTATE imagine un espace de travail pour suivre projets, tâches et priorités. Le concept s’intéresse à la densité d’information : rendre un système riche compréhensible dès le premier regard.',
      headline:'Transformer la complexité en clarté opérationnelle.',
      questionTitle:'Comment donner une vue d’ensemble sans surcharger le tableau de bord ?',
      question:'Un outil de pilotage doit exposer les états importants, aider à prioriser et permettre d’agir rapidement sans perdre le contexte.',
      responseTitle:'Une architecture qui sépare le signal du bruit.',
      response:'Les indicateurs, les projets actifs et les prochaines actions sont organisés en niveaux de lecture complémentaires.',
      p1t:'La hiérarchie avant la densité.',p1:'Les données prioritaires apparaissent en premier, avec des niveaux de détail progressifs.',
      p2t:'Un langage fonctionnel.',p2:'Couleurs, états et composants servent la compréhension plutôt que l’ornement.',
      p3t:'Des actions à portée de main.',p3:'Les vues synthétiques rapprochent les informations des prochaines décisions.',
      scopeIntro:'L’exploration couvre la structure d’un tableau de bord et les composants nécessaires à une lecture rapide des activités.',
      scope:['Architecture de l’information','Système de composants UI','Vue synthétique responsive','États, indicateurs et priorités'],
      honesty:'Concept indépendant. Les données affichées sont fictives et l’interface ne correspond pas à un logiciel commercial ou déployé.',
      art:'assets/project-flowstate.svg', next:'naya-house', nextName:'NAYA HOUSE', nextType:'Hospitalité / Concept de site web', nextNumber:'001',
      artKicker:'FLOWSTATE / WORKSPACE STUDY'
    }
  };
  const caseName = one('#case-name');
  if (caseName) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('ref') || 'naya-house';
    const key = Object.prototype.hasOwnProperty.call(projectData, requested) ? requested : 'naya-house';
    const data = projectData[key];
    document.body.dataset.caseLayout = key;
    const prototypeCopy = {
      'naya-house': ['03 / PARCOURS INVITÉ','Retrouver le','temps juste.','Une expérience d’hospitalité qui commence par une atmosphère, puis accompagne la préparation du séjour.','ÉTUDE D’EXPÉRIENCE IMMERSIVE'],
      'forme': ['03 / COLLECTION','Des objets avec','présence.','Une vitrine éditoriale pensée comme une galerie : les objets prennent la place, le récit accompagne.','ÉTUDE DE COMMERCE ÉDITORIAL'],
      'flowstate': ['03 / ESPACE DE TRAVAIL','La clarté au','quotidien.','Un espace produit dense et fonctionnel, conçu pour faire émerger les priorités et rapprocher les actions du contexte.','ÉTUDE D’INTERFACE PRODUIT'],
    }[key];
    const put = (selector, value) => { const node = one(selector); if (node) node.textContent = value; };
    const prototypeFields = {
      '[data-prototype-kicker]':prototypeCopy[0],
      '[data-prototype-title]':prototypeCopy[1] + ' ',
      '[data-prototype-copy]':prototypeCopy[3],
      '[data-prototype-stamp]':prototypeCopy[4] + ' / NO DATA TRANSMITTED'
    };
    Object.entries(prototypeFields).forEach(([selector,value])=>put(selector,value));
    const prototypeTitle=one('[data-prototype-title]');
    if(prototypeTitle) prototypeTitle.innerHTML=prototypeCopy[1]+' <em>'+prototypeCopy[2]+'</em>';
    const fields = {
      '#case-name':data.name,'#case-type':data.type,'#case-lede':data.lede,
      '#case-discipline':data.discipline,'#case-scope':data.scopeShort,'#case-intro':data.intro,'#case-headline':data.headline,
      '#case-question-title':data.questionTitle,'#case-question':data.question,
      '#case-response-title':data.responseTitle,'#case-response':data.response,
      '#case-principle-one-title':data.p1t,'#case-principle-one':data.p1,
      '#case-principle-two-title':data.p2t,'#case-principle-two':data.p2,
      '#case-principle-three-title':data.p3t,'#case-principle-three':data.p3,
      '#case-scope-intro':data.scopeIntro,'#case-scope-a':data.scope[0],
      '#case-scope-b':data.scope[1],'#case-scope-c':data.scope[2],'#case-scope-d':data.scope[3],
      '#case-honesty':data.honesty
    };
    Object.entries(fields).forEach(([selector,value])=>put(selector,value));
    put('[data-case-number]',data.number);
    put('[data-art-kicker]',data.artKicker);
    put('[data-next-number]',data.nextNumber);
    put('[data-next-name]',data.nextName);
    put('[data-next-type]',data.nextType);
    const artwork=one('[data-case-artwork]');
    if(artwork) artwork.dataset.art=key;
    const next=one('[data-case-next]');
    if(next) next.href='project.html?ref='+data.next;
    const art=one('#case-art');
    if(art){art.src=data.art;art.alt='Étude visuelle du concept '+data.name;}
    document.title=data.name+' — Étude de cas — ORBE & ONIX';
  }

  // Interactive concept prototypes. All state is local to this browser session.
  const requestedDemo = new URLSearchParams(window.location.search).get('ref') || 'naya-house';
  const demoKey = ['naya-house', 'forme', 'flowstate'].includes(requestedDemo) ? requestedDemo : 'naya-house';
  all('[data-project-demo]').forEach(demo => {
    demo.hidden = demo.dataset.projectDemo !== demoKey;
  });

  const nayaDemo = one('[data-project-demo="naya-house"]');
  if (nayaDemo) {
    const scenes = {
      stay: { title:'Un lieu pour<br><em>ralentir.</em>', copy:'Un refuge pensé pour retrouver le rythme du paysage, entre lumière douce, matières naturelles et horizons ouverts.', caption:'SÉJOUR CÔTIER / CAMEROUN' },
      spaces: { title:'De l’espace pour<br><em>respirer.</em>', copy:'Des espaces ouverts, des matières tactiles et des perspectives cadrées sur le paysage. Chaque détail invite à prendre son temps.', caption:'ESPACES / MATIÈRE / LUMIÈRE' },
      rituals: { title:'Trouver votre<br><em>rythme.</em>', copy:'Un café face à la lumière, une marche au bord de l’eau, une fin de journée sans programme. Le séjour se compose à votre rythme.', caption:'INSTANTS CALMES / RITUELS DU JOUR' }
    };
    all('[data-naya-scene]').filter(node => node.tagName === 'BUTTON').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.nayaScene;
        const scene = scenes[key];
        if (!scene) return;
        all('[data-naya-scene]').filter(node => node.tagName === 'BUTTON').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        const title = one('[data-naya-title]');
        const copy = one('[data-naya-copy]');
        const caption = one('.naya-demo-caption');
        const visual = one('.naya-demo-visual');
        if (title) title.innerHTML = scene.title;
        if (copy) copy.textContent = scene.copy;
        if (caption) caption.textContent = scene.caption;
        if (visual) visual.dataset.nayaScene = key;
      });
    });
    const guests = one('[data-naya-guests]');
    const nights = one('[data-naya-nights]');
    const arrival = one('[data-naya-arrival]');
    const summary = one('[data-naya-summary]');
    const localDate = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const updateStay = () => {
      if (!summary || !guests || !nights) return;
      const guestLabel = String(guests.value).padStart(2,'0') + (Number(guests.value) > 1 ? ' voyageurs' : ' voyageur');
      let stayLabel = String(nights.value).padStart(2,'0') + ' nuits';
      if (arrival && arrival.value) {
        const start = new Date(arrival.value + 'T12:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + Number(nights.value));
        const formatter = new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'});
        stayLabel += ' / ' + formatter.format(start) + ' → ' + formatter.format(end);
      }
      summary.textContent = guestLabel + ' · ' + stayLabel;
    };
    if (arrival) {
      const today = new Date();
      arrival.min = localDate(today);
      const suggested = new Date(today);
      suggested.setDate(suggested.getDate() + 14);
      arrival.value = localDate(suggested);
    }
    [guests,nights,arrival].filter(Boolean).forEach(control => control.addEventListener('change',updateStay));
    updateStay();
  }

  const formeDemo = one('[data-project-demo="forme"]');
  if (formeDemo) {
    const bag = [];
    const count = one('[data-forme-count]');
    const summary = one('[data-forme-summary]');
    const clear = one('[data-forme-clear]');
    const renderBag = () => {
      if (count) count.textContent = String(bag.length).padStart(2,'0');
      if (summary) summary.textContent = bag.length ? bag.join(' · ') : 'Votre panier est vide. Choisissez un objet pour commencer.';
      if (clear) clear.disabled = bag.length === 0;
      all('[data-forme-add]').forEach(button => {
        const selected = bag.includes(button.dataset.formeAdd);
        button.textContent = selected ? 'Ajouté ✓' : 'Ajouter au panier +';
        button.setAttribute('aria-pressed',String(selected));
      });
    };
    all('[data-forme-add]').forEach(button => button.addEventListener('click',() => {
      const item=button.dataset.formeAdd;
      const index=bag.indexOf(item);
      if(index>=0) bag.splice(index,1); else bag.push(item);
      renderBag();
    }));
    if(clear) clear.addEventListener('click',()=>{bag.length=0;renderBag();});
    renderBag();
  }

  const flowDemo = one('[data-project-demo="flowstate"]');
  if (flowDemo) {
    const tabs=all('[data-flow-tab]');
    const panels=all('[data-flow-panel]');
    const switchFlowTab = key => {
      tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.flowTab===key)));
      panels.forEach(panel=>{panel.hidden=panel.dataset.flowPanel!==key;});
    };
    tabs.forEach(tab=>tab.addEventListener('click',()=>switchFlowTab(tab.dataset.flowTab)));
    const taskIds=['review','notes','share'];
    const taskState={review:false,notes:false,share:false};
    const updateTasks=changed=>{
      if(changed && Object.prototype.hasOwnProperty.call(taskState,changed.dataset.flowTask)) {
        taskState[changed.dataset.flowTask]=changed.checked;
        all('[data-flow-task="'+changed.dataset.flowTask+'"]').forEach(box=>{box.checked=changed.checked;});
      }
      const completed=taskIds.filter(id=>taskState[id]).length;
      const open=taskIds.length-completed;
      all('[data-flow-open-count]').forEach(node=>node.textContent=String(open).padStart(2,'0'));
      all('[data-flow-task-count]').forEach(node=>node.textContent=String(open).padStart(2,'0')+' OPEN');
      all('[data-flow-progress-label]').forEach(node=>node.textContent=completed+' of 3 completed');
      all('[data-flow-progress]').forEach(node=>node.style.width=(completed/3*100)+'%');
      const bars=all('[role="progressbar"]');
      bars.forEach(bar=>bar.setAttribute('aria-valuenow',String(completed)));
    };
    all('[data-flow-task]').forEach(box=>box.addEventListener('change',()=>updateTasks(box)));
    switchFlowTab('overview');
    updateTasks(null);
  }

  // Portfolio threshold: open, enter the gallery, then travel back out on close.
  const doorScene = one('[data-door-reveal]');
  if (doorScene && new URLSearchParams(window.location.search).get('door') === '1') {
    const doorRoom = one('[data-door-room]', doorScene);
    const openButton = one('[data-door-open]', doorScene);
    const closeButton = one('[data-door-close]', doorScene);
    const galleryTitle = one('#door-gallery-title', doorScene);
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doorTimers = [];
    let doorOpened = false;
    let doorExiting = false;

    const later = (callback, delay) => {
      const timer = window.setTimeout(callback, reducedMotion ? 0 : delay);
      doorTimers.push(timer);
    };

    const clearDoorTimers = () => {
      doorTimers.forEach(window.clearTimeout);
      doorTimers.length = 0;
    };

    const finishDoorExit = () => {
      clearDoorTimers();
      doorOpened = false;
      doorExiting = false;

      // Stay in the threshold scene: restore the closed door, not the page below it.
      doorScene.classList.remove('is-open', 'is-entering', 'has-entered', 'is-exiting', 'is-exit-close');
      doorScene.hidden = false;
      doorScene.setAttribute('aria-hidden', 'false');
      if (doorRoom) doorRoom.setAttribute('aria-hidden', 'true');

      // Keep the URL and page lock intact so the visitor can enter the gallery again.
      if (openButton) openButton.focus({ preventScroll: true });
    };

    const exitDoorScene = () => {
      if (!doorOpened || doorExiting) return;
      doorExiting = true;
      clearDoorTimers();
      if (doorRoom) doorRoom.setAttribute('aria-hidden', 'true');

      // Reverse the arrival: retreat through the arch, then close the leaf behind us.
      doorScene.classList.remove('is-entering', 'has-entered', 'is-exit-return');
      doorScene.classList.add('is-exiting');
      later(() => doorScene.classList.add('is-exit-close'), 670);
      later(finishDoorExit, 1370);
    };

    const openDoor = () => {
      if (doorOpened || doorExiting) return;
      doorOpened = true;
      doorScene.classList.add('is-open');

      later(() => {
        if (!doorOpened || doorExiting) return;
        doorScene.classList.add('is-entering');
      }, 1080);

      later(() => {
        if (!doorOpened || doorExiting) return;
        doorScene.classList.add('has-entered');
        if (doorRoom) doorRoom.setAttribute('aria-hidden', 'false');
        if (galleryTitle) galleryTitle.focus({ preventScroll: true });
      }, 2420);
    };

    const onDoorKey = event => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (!doorOpened) openDoor();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (doorOpened) exitDoorScene();
      }
    };

    const onDoorContext = event => {
      if (doorOpened || doorExiting) return;
      event.preventDefault();
      openDoor();
    };

    document.body.classList.add('door-reveal-active');
    doorScene.hidden = false;
    doorScene.setAttribute('aria-hidden', 'false');
    if (doorRoom) doorRoom.setAttribute('aria-hidden', 'true');
    if (openButton) openButton.addEventListener('click', openDoor);
    if (closeButton) closeButton.addEventListener('click', exitDoorScene);
    doorScene.addEventListener('keydown', onDoorKey);
    doorScene.addEventListener('contextmenu', onDoorContext);
    if (openButton) window.setTimeout(() => openButton.focus({ preventScroll: true }), 60);
  }

  all('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
})();