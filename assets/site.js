(() => {
 const $=(s,root=document)=>root.querySelector(s);
 const $$=(s,root=document)=>[...root.querySelectorAll(s)];
 const toggle=$('.menu-toggle'),nav=$('.nav');
 if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});$$('a',nav).forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');}));}
 const filters=$$('.filter-btn'),cards=$$('[data-category]');
 filters.forEach(btn=>btn.addEventListener('click',()=>{const cat=btn.dataset.filter;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));cards.forEach(card=>{card.hidden=cat!=='all'&&card.dataset.category!==cat;});}));
 const reveal=$$('.reveal');
 if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.12});reveal.forEach(el=>io.observe(el));}else reveal.forEach(el=>el.classList.add('is-visible'));
 const cursor=$('.cursor-orb');if(cursor&&matchMedia('(pointer:fine)').matches){window.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';},{passive:true});}
 const projectData={
  'naya-house':{name:'NAYA HOUSE',type:'Hospitality / Website concept',intro:'Une expérience digitale imaginée pour une adresse hôtelière contemporaine. Le concept explore une navigation calme, une hiérarchie éditoriale généreuse et une présentation immersive des espaces.',goal:'Présenter un lieu et faciliter la prise de contact',scope:'Direction artistique, UX, interface responsive',status:'Concept indépendant'},
  'forme':{name:'FORME',type:'Commerce / E-commerce concept',intro:'Une boutique de décoration conçue autour de la matière, de la lumière et d’un catalogue lisible. Le concept propose une expérience produit minimaliste et tactile.',goal:'Valoriser une collection et son univers',scope:'Direction artistique, parcours boutique, UI',status:'Concept indépendant'},
  'flowstate':{name:'FLOWSTATE',type:'Digital product / Application concept',intro:'Un tableau de bord imaginé pour rendre le suivi de projets plus clair. Le concept explore la visualisation des tâches, les états et la densité d’information.',goal:'Clarifier le suivi des projets',scope:'Architecture d’information, UX, interface',status:'Concept indépendant'}
 };
 const query=new URLSearchParams(location.search).get('ref')||'naya-house',data=projectData[query]||projectData['naya-house'];
 if($('#case-name')){$('#case-name').textContent=data.name;$('#case-type').textContent=data.type;$('#case-intro').textContent=data.intro;$('#case-goal').textContent=data.goal;$('#case-scope').textContent=data.scope;$('#case-status').textContent=data.status;document.title=data.name+' — ORBE & ONIX';}
 $$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

 const stage=$('[data-parallax]'),stageObject=$('.hero-stage-object');
 if(stage&&stageObject&&matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   let raf=0,px=0,py=0;
   stage.addEventListener('pointermove',e=>{
     const r=stage.getBoundingClientRect();
     px=((e.clientX-r.left)/r.width-.5);
     py=((e.clientY-r.top)/r.height-.5);
     if(!raf)raf=requestAnimationFrame(()=>{
       stageObject.style.transform='rotate('+(-5+px*4)+'deg) translate3d('+px*12+'px,'+py*12+'px,0) scale(1.015)';
       raf=0;
     });
   });
   stage.addEventListener('pointerleave',()=>{stageObject.style.transform='';});
 }
 const magnetic=$('[data-magnetic]');
 magnetic.forEach(el=>{
   if(!matchMedia('(pointer:fine)').matches)return;
   el.addEventListener('pointermove',e=>{
     const r=el.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/r.width,y=(e.clientY-r.top-r.height/2)/r.height;
     el.style.transform='translate('+x*7+'px,'+y*6+'px)';
   });
   el.addEventListener('pointerleave',()=>{el.style.transform='';});
 });
})();