/* ORBE & ONIX — Open Experiments / 3D material instrument */
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';
const host=document.querySelector('[data-material-stage]');
if(host){
 const fallback=()=>host.classList.remove('has-webgl');
 import(THREE_URL).then(THREE=>{
  if(!host.isConnected||host.dataset.webglMounted)return;
  host.dataset.webglMounted='1';
  const canvas=document.createElement('canvas');
  canvas.className='material-canvas';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}
  catch(e){canvas.remove();fallback();console.warn('[Lab 3D] WebGL unavailable; CSS fallback retained.',e);return;}
  renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,40);
  camera.position.set(0,0,4.65);

  // Procedural studio environment: bright softboxes give glass and metal readable reflections.
  const envCanvas=document.createElement('canvas');
  envCanvas.width=1024;envCanvas.height=512;
  const envCtx=envCanvas.getContext('2d');
  const envGradient=envCtx.createLinearGradient(0,0,0,512);
  envGradient.addColorStop(0,'#293044');envGradient.addColorStop(.48,'#11131d');envGradient.addColorStop(1,'#3a2c4b');
  envCtx.fillStyle=envGradient;envCtx.fillRect(0,0,1024,512);
  const softbox=(x,y,rx,ry,color)=>{const g=envCtx.createRadialGradient(x,y,2,x,y,rx);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');envCtx.save();envCtx.scale(1,ry/rx);envCtx.fillStyle=g;envCtx.beginPath();envCtx.arc(x,y*rx/ry,rx,0,Math.PI*2);envCtx.fill();envCtx.restore();};
  softbox(220,170,175,80,'rgba(232,224,255,.95)');
  softbox(730,205,190,95,'rgba(94,211,239,.78)');
  softbox(500,65,130,60,'rgba(255,224,194,.62)');
  softbox(850,410,190,90,'rgba(162,128,236,.7)');
  const environment=new THREE.CanvasTexture(envCanvas);
  environment.mapping=THREE.EquirectangularReflectionMapping;
  environment.colorSpace=THREE.SRGBColorSpace;
  scene.environment=environment;scene.environmentIntensity=1.15;

  scene.add(new THREE.HemisphereLight(0xe8e0ff,0x17121e,1.45));
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-3.2,3.5,4);scene.add(key);
  const lilac=new THREE.PointLight(0xb59aff,26,9,2);lilac.position.set(2.8,.8,2);scene.add(lilac);
  const cyan=new THREE.PointLight(0x62d9ef,17,8,2);cyan.position.set(-2.5,-1.8,1.4);scene.add(cyan);
  const warm=new THREE.PointLight(0xffd8ad,7,7,2);warm.position.set(.2,2.8,-2);scene.add(warm);
  const sculpture=new THREE.Group();scene.add(sculpture);
  const geometry=new THREE.TorusKnotGeometry(.78,.205,240,32,2,3);
  const materials={
   glass:new THREE.MeshPhysicalMaterial({color:0xcfc4ff,metalness:.04,roughness:.09,transmission:.88,thickness:.8,ior:1.46,clearcoat:1,clearcoatRoughness:.06,attenuationColor:0xa99bdf,attenuationDistance:2.4}),
   liquid:new THREE.MeshPhysicalMaterial({color:0xbac8de,metalness:.88,roughness:.16,clearcoat:1,clearcoatRoughness:.08,iridescence:.42,iridescenceIOR:1.28}),
   veil:new THREE.MeshPhysicalMaterial({color:0xc9b8ff,metalness:.12,roughness:.27,transmission:.34,thickness:.35,ior:1.22,clearcoat:.78,clearcoatRoughness:.2,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide})
  };
  const knot=new THREE.Mesh(geometry,materials.glass);sculpture.add(knot);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.255,4),new THREE.MeshPhysicalMaterial({color:0xe7ddff,metalness:.18,roughness:.18,emissive:0x5b438f,emissiveIntensity:.34,clearcoat:1}));sculpture.add(core);
  const ringMat=new THREE.MeshBasicMaterial({color:0xd9d0ff,transparent:true,opacity:.64});
  const ringA=new THREE.Mesh(new THREE.TorusGeometry(1.42,.006,8,180),ringMat);ringA.rotation.set(1.12,.25,-.38);sculpture.add(ringA);
  const ringB=new THREE.Mesh(new THREE.TorusGeometry(1.19,.004,8,180),new THREE.MeshBasicMaterial({color:0x62d9ef,transparent:true,opacity:.42}));ringB.rotation.set(.38,-.72,.65);sculpture.add(ringB);
  const bead=new THREE.Mesh(new THREE.SphereGeometry(.045,18,12),new THREE.MeshBasicMaterial({color:0xffffff}));bead.position.set(1.42,0,0);ringA.add(bead);
  host.addEventListener('lab:materialchange',e=>{const m=e.detail?.material;if(materials[m]){knot.material=materials[m];core.material.emissiveIntensity=m==='veil'?.5:.34;ringMat.opacity=m==='liquid'?.82:.58;}});
  let w=1,h=1,raf=0,running=false,last=0,elapsed=0,drag=false,px=0,py=0,rx=0,ry=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const render=()=>renderer.render(scene,camera);
  const resize=()=>{w=Math.max(1,host.clientWidth);h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<560?5.15:4.65;camera.updateProjectionMatrix();render();};
  const frame=now=>{if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;
   if(!reduced.matches){if(!drag)ry+=.045*dt;sculpture.rotation.y+=(ry-sculpture.rotation.y)*Math.min(1,dt*3);sculpture.rotation.x+=(rx-sculpture.rotation.x)*Math.min(1,dt*3);knot.rotation.z=Math.sin(elapsed*.32)*.07;core.rotation.y-=.24*dt;ringA.rotation.y+=.12*dt;ringB.rotation.x-=.09*dt;}
   render();raf=requestAnimationFrame(frame);
  };
  const start=()=>{if(running)return;render();if(reduced.matches)return;running=true;last=performance.now();raf=requestAnimationFrame(frame);};
  const stop=()=>{running=false;cancelAnimationFrame(raf);};
  const io=new IntersectionObserver(([e])=>e.isIntersecting&&!document.hidden?start():stop(),{threshold:.02});io.observe(host);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  reduced.addEventListener('change',()=>reduced.matches?(stop(),render()):start());
  host.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;host.setPointerCapture?.(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!drag)return;ry+=(e.clientX-px)*.008;rx=Math.max(-.72,Math.min(.72,rx+(e.clientY-py)*.006));px=e.clientX;py=e.clientY;if(reduced.matches)render();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>host.addEventListener(t,()=>drag=false));
  host.addEventListener('keydown',event=>{
   const step=.12;
   if(event.key==='ArrowLeft')ry-=step;
   else if(event.key==='ArrowRight')ry+=step;
   else if(event.key==='ArrowUp')rx=Math.max(-.72,rx-step);
   else if(event.key==='ArrowDown')rx=Math.min(.72,rx+step);
   else return;
   event.preventDefault();
   if(reduced.matches)render();
  });

  new ResizeObserver(resize).observe(host);host.classList.add('has-webgl');
  const active=document.querySelector('[data-material][aria-pressed="true"]')?.dataset.material||host.dataset.materialStage||'glass';
  if(materials[active])knot.material=materials[active];resize();start();
  addEventListener('pagehide',()=>{stop();io.disconnect();geometry.dispose();renderer.dispose();environment.dispose();},{once:true});
 }).catch(e=>{fallback();console.warn('[Lab 3D] Module indisponible; CSS fallback retained.',e);});
}