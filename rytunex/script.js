// Small helper to respect reduced-motion
const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// Reveal elements on scroll (simple)
function initReveal(){
  if(reducedMotion) return;
  const opts = {threshold:0.12};
  const obs = new IntersectionObserver((entries, o)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        en.target.classList.add('revealed');
        o.unobserve(en.target);
      }
    });
  }, opts);

  document.querySelectorAll('.feature-card, .hero-inner, .cta-strip').forEach((el,i)=>{
    el.style.transitionDelay = `${i * 80}ms`;
    obs.observe(el);
    const rect = el.getBoundingClientRect();
    if(rect.top <= window.innerHeight * 0.9){
      el.classList.add('revealed');
      obs.unobserve(el);
    }
  });
}

// Optional interactive background parallax for large screens (passive events)
function initParallax(){
  if(reducedMotion) return;
  if(window.innerWidth < 900) return;
  const decor = document.querySelector('.hero-decor');
  if(!decor) return;
  let raf = null;
  function onMove(e){
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const x = (e.clientX / window.innerWidth - 0.5) * 30; // more noticeable
      const y = (e.clientY / window.innerHeight - 0.5) * 22;
      decor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }
  document.addEventListener('mousemove', onMove, {passive:true});
}

/* Animated canvas background - optimized particles and subtle connections */
function initCanvasBG(){
  if(reducedMotion) return;
  if(window.innerWidth < 700) return; // skip on small screens
  if(navigator.deviceMemory && navigator.deviceMemory < 1.5) return; // low-memory devices
  if(navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) return; // low-core devices

  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  // adaptive particle count based on area, but capped
  const area = width * height;
  const count = Math.max(18, Math.min(80, Math.floor(area / 60000)));
  const particles = new Array(count);
  for(let i=0;i<count;i++){
    particles[i] = {
      x:Math.random()*width,
      y:Math.random()*height,
      vx:(Math.random()-0.5)*(0.6 + Math.random()*0.8),
      vy:(Math.random()-0.5)*(0.6 + Math.random()*0.8),
      r: 0.8 + Math.random()*2.4
    };
  }

  let resizeTimeout;
  function handleResize(){
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(()=>{
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, 120);
  }
  window.addEventListener('resize', handleResize, {passive:true});

  let rafId = 0;
  const maxDist = Math.max(120, Math.min(220, Math.sqrt(width*height)/8));
  const maxDistSq = maxDist * maxDist;

  function frame(){
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = 'rgba(2,6,23,0.22)';
    ctx.fillRect(0,0,width,height);

    for(let i=0;i<particles.length;i++){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if(p.x < -10) p.x = width + 10; else if(p.x > width + 10) p.x = -10;
      if(p.y < -10) p.y = height + 10; else if(p.y > height + 10) p.y = -10;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }

    // connections with cheap bounds check to avoid sqrt for many pairs
    for(let i=0;i<particles.length;i++){
      const a = particles[i];
      for(let j=i+1;j<particles.length;j++){
        const b = particles[j];
        const dx = a.x - b.x; if(Math.abs(dx) > maxDist) continue;
        const dy = a.y - b.y; if(Math.abs(dy) > maxDist) continue;
        const d2 = dx*dx + dy*dy;
        if(d2 > maxDistSq) continue;
        const alpha = 0.09 * (1 - d2 / maxDistSq);
        ctx.strokeStyle = `rgba(241,119,166,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }

    rafId = requestAnimationFrame(frame);
  }
  frame();

  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ cancelAnimationFrame(rafId); }
    else { frame(); }
  });
}

// initialize subtle effects after load
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    initParallax();
    initCanvasBG();
  }, 500);
});

// Fetch GitHub releases and sum downloads; update UI
async function loadDownloadCount(){
  const el = document.getElementById('download-count');
  if(!el) return;
  // We'll use the shields.io badge JSON which already exposes the total downloads
  // (no need to sum assets). Fallback to the GitHub releases API if shields fails.
  const SHIELDS = 'https://img.shields.io/github/downloads/rayenghanmi/rytunex/total.json';
  const FALLBACK_API = 'https://api.github.com/repos/rayenghanmi/RyTuneX/releases';
  const COUNT_KEY = 'rxt_count_v1';

  // Show cached value if available
  try{
    const cached = localStorage.getItem(COUNT_KEY);
    if(cached) el.textContent = cached;
  } catch(e){ }

  try{
    const res = await fetch(SHIELDS, { cache: 'no-cache' });
    if(!res.ok) throw new Error('shields failed');
    const json = await res.json();
    // shields returns { label, message, ... } where message is the rendered text
    const message = json && (json.message || json.value || '—');
    if(message && el.textContent !== String(message)){
      if(!reducedMotion){
        el.animate([{opacity:0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}],{duration:420,easing:'ease-out'});
      }
      el.textContent = message;
    }
    try{ localStorage.setItem(COUNT_KEY, String(message)); } catch(e){}
    return;
  }catch(err){
    // shields failed — fallback to GitHub releases summation (original behavior)
    try{
      const res2 = await fetch(FALLBACK_API);
      if(!res2.ok) throw new Error('github api failed');
      const data = await res2.json();
      let total = 0;
      data.forEach(rel=> rel.assets && rel.assets.forEach(a=> total += a.download_count || 0));
      let formatted = total;
      if(total >= 1000000) formatted = (total/1000000).toFixed(1) + 'M';
      else if(total >= 1000) formatted = (total/1000).toFixed(1) + 'K';
      if(el.textContent !== String(formatted)){
        if(!reducedMotion){
          el.animate([{opacity:0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}],{duration:420,easing:'ease-out'});
        }
        el.textContent = formatted;
      }
      try{ localStorage.setItem(COUNT_KEY, formatted); } catch(e){}
    }catch(err2){
      console.warn('download count failed', err, err2);
    }
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  initReveal();
  loadDownloadCount();
  // mobile nav toggle behavior
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if(toggle && navLinks){
    toggle.addEventListener('click', (e)=>{
      const open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // close when clicking a link
    navLinks.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=>{
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }));
    // close on outside click
    document.addEventListener('click', (ev)=>{
      if(!navLinks.contains(ev.target) && !toggle.contains(ev.target)){
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
      }
    });
  }
});
