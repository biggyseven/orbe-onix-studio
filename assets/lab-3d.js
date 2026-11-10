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
  const coarse=matchMedia('(pointer: coarse)').matches;renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.85:2.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
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
  // Crisp rectangular softboxes create readable highlights on the metal and glass.
  const addSoftbox=(x,y,width,height,color)=>{
   envCtx.save();envCtx.shadowColor=color;envCtx.shadowBlur=22;
   envCtx.fillStyle=color;envCtx.fillRect(x,y,width,height);envCtx.restore();
  };
  addSoftbox(135,90,125,26,'rgba(255,255,255,.96)');
  addSoftbox(650,145,165,22,'rgba(108,222,242,.92)');
  addSoftbox(420,345,90,18,'rgba(212,195,255,.82)');
  scene.environment=environment;scene.environmentIntensity=1.42;

  scene.add(new THREE.HemisphereLight(0xe8e0ff,0x17121e,1.45));
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-3.2,3.5,4);scene.add(key);
  const lilac=new THREE.PointLight(0xb59aff,26,9,2);lilac.position.set(2.8,.8,2);scene.add(lilac);
  const cyan=new THREE.PointLight(0x62d9ef,17,8,2);cyan.position.set(-2.5,-1.8,1.4);scene.add(cyan);
  const warm=new THREE.PointLight(0xffd8ad,7,7,2);warm.position.set(.2,2.8,-2);scene.add(warm);
  const sculpture=new THREE.Group();sculpture.scale.setScalar(.9);scene.add(sculpture);
  // Orbit guides live behind the sculpture, never inside its geometry.
  const orbitRig=new THREE.Group();orbitRig.position.set(0,0,-1.55);scene.add(orbitRig);
  const geometry=new THREE.TorusKnotGeometry(.78,.205,384,48,2,3);
  const materials={
   glass:new THREE.MeshPhysicalMaterial({color:0xd8d0ff,metalness:.025,roughness:.045,transmission:.78,thickness:1.0,ior:1.47,clearcoat:1,clearcoatRoughness:.035,attenuationColor:0xa99bdf,attenuationDistance:2.8}),
   liquid:new THREE.MeshPhysicalMaterial({color:0xd3d8ee,metalness:.96,roughness:.095,clearcoat:1,clearcoatRoughness:.035,iridescence:.32,iridescenceIOR:1.28,envMapIntensity:1.55}),
   veil:new THREE.MeshPhysicalMaterial({color:0xc9b8ff,metalness:.12,roughness:.27,transmission:.34,thickness:.35,ior:1.22,clearcoat:.78,clearcoatRoughness:.2,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide})
  };
  const knot=new THREE.Mesh(geometry,materials.glass);sculpture.add(knot);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.255,4),new THREE.MeshPhysicalMaterial({color:0xe7ddff,metalness:.18,roughness:.18,emissive:0x5b438f,emissiveIntensity:.34,clearcoat:1}));sculpture.add(core);
  const ringMat=new THREE.MeshBasicMaterial({color:0xded7ff,transparent:true,opacity:.56,depthTest:true,depthWrite:false});
  const ringA=new THREE.Mesh(new THREE.TorusGeometry(1.68,.006,10,320),ringMat);
  ringA.rotation.set(.42,.12,-.22);orbitRig.add(ringA);
  const ringB=new THREE.Mesh(new THREE.TorusGeometry(1.86,.004,8,320),
    new THREE.MeshBasicMaterial({color:0x66ddec,transparent:true,opacity:.28,depthTest:true,depthWrite:false}));
  ringB.rotation.set(.58,-.28,.34);orbitRig.add(ringB);
  host.addEventListener('lab:materialchange',e=>{const m=e.detail?.material;if(materials[m]){knot.material=materials[m];core.material.emissiveIntensity=m==='veil'?.5:.34;ringMat.opacity=m==='liquid'?.82:.58;}});
  let w=1,h=1,raf=0,running=false,last=0,elapsed=0,drag=false,px=0,py=0,rx=0,ry=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const render=()=>renderer.render(scene,camera);
  const resize=()=>{w=Math.max(1,host.clientWidth);h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<560?5.35:5.05;camera.updateProjectionMatrix();render();};
  const frame=now=>{if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;
   if(!reduced.matches){if(!drag)ry+=.045*dt;sculpture.rotation.y+=(ry-sculpture.rotation.y)*Math.min(1,dt*3);sculpture.rotation.x+=(rx-sculpture.rotation.x)*Math.min(1,dt*3);knot.rotation.z=Math.sin(elapsed*.32)*.07;core.rotation.y-=.24*dt;orbitRig.rotation.z+=.12*dt;orbitRig.rotation.x=Math.sin(elapsed*.18)*.045;}
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