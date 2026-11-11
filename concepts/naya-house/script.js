(() => {
 const header=document.querySelector('[data-header]');
 const toggle=document.querySelector('[data-toggle]');
 const nav=document.querySelector('[data-nav]');
 const closeMenu=()=>{toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Ouvrir le menu');nav?.classList.remove('open')};
 const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>36);
 updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});
 toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'Ouvrir le menu':'Fermer le menu');nav?.classList.toggle('open',!open)});
 nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 const items=document.querySelectorAll('.reveal');
 if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});items.forEach(item=>observer.observe(item))}else items.forEach(item=>item.classList.add('visible'));
 const modal=document.querySelector('[data-modal]'),modalImage=document.querySelector('[data-modal-image]'),caption=document.querySelector('[data-modal-caption]'),close=document.querySelector('[data-close]');let previous=null;
 const hide=()=>{if(!modal?.classList.contains('open'))return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('locked');if(modalImage)modalImage.src='';previous?.focus()};
 document.querySelectorAll('[data-lightbox]').forEach(button=>button.addEventListener('click',()=>{if(!modal||!modalImage)return;previous=button;modalImage.src=button.dataset.src||'';modalImage.alt=button.querySelector('img')?.alt||button.dataset.caption||'Photographie NAYA HOUSE';if(caption)caption.textContent=button.dataset.caption||'';modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('locked');close?.focus()}));
 close?.addEventListener('click',hide);modal?.addEventListener('click',e=>{if(e.target===modal)hide()});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 const form=document.querySelector('[data-form]'),feedback=document.querySelector('[data-feedback]'),arrival=form?.elements.namedItem('arrival'),departure=form?.elements.namedItem('departure');
 if(arrival&&departure){const now=new Date(),today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);arrival.min=today;departure.min=today;arrival.addEventListener('change',()=>{departure.min=arrival.value||today;if(departure.value&&departure.value<=arrival.value)departure.value=''})}
 form?.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;if(arrival?.value&&departure?.value&&departure.value<=arrival.value){feedback.textContent='La date de départ doit être postérieure à la date d’arrivée.';departure.focus();return}feedback.textContent='Merci ! Le parcours de demande fonctionne en démonstration, mais aucun message n’a été envoyé : le formulaire n’est pas encore connecté.';form.reset();departure.min=arrival?.min||''});
 document.querySelectorAll('[data-year]').forEach(node=>node.textContent=new Date().getFullYear());
})();