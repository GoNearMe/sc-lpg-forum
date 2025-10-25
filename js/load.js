// js/forged-loader.js
// Cinematic page loader + Post spinner + Animated reveal with timing control
(() => {
  "use strict";

  // ==============================================================
  // CONFIGURATION — easily change timings here
  // ==============================================================
  const CFG = {
    brand: "ЛПГ — Форум",
    logoSrc: "assets/Logo.jpg",
    accent: "#3867d6",
    accent2: "#ff9f43",
    bg0: "#eef6fb",
    gridOpacity: 0.06,
    blurPx: 16,
    fadeMs: 420,
    popStagger: 70,
    ease: "cubic-bezier(.22,1,.36,1)",

    // 🕒 Timing setup
    mainLoaderDuration: 1000,   // Time (ms) for full-screen cinematic loader
    postSpinnerDuration: 1500,  // Time (ms) for post spinner skeleton loader
    revealDelayMs: 90,          // Delay between post reveal animations

    // 🧱 Skeleton count
    skeletonCountMax: 10,
    skeletonMin: 10,
  };

  const prefersReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ==============================================================
  // CSS
  // ==============================================================
  const css = document.createElement("style");
  css.textContent = `
  :root { --lz-ease:${CFG.ease}; --lz-fade:${CFG.fadeMs}ms; }
  .lz-loader {
    position:fixed; inset:0; z-index:9999; display:grid; place-items:center;
    background: radial-gradient(1200px 800px at 50% 20%, rgba(255,255,255,.9), ${CFG.bg0} 65%);
    backdrop-filter:blur(${CFG.blurPx}px);
    transition:opacity var(--lz-fade) var(--lz-ease), visibility var(--lz-fade) var(--lz-ease);
  }
  .lz-hidden{opacity:0;visibility:hidden;pointer-events:none}
  .lz-grid{
    position:absolute;inset:0;
    background-image:linear-gradient(0deg,rgba(0,0,0,${CFG.gridOpacity}) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(0,0,0,${CFG.gridOpacity}) 1px,transparent 1px);
    background-size:56px 56px;animation:gridShift 30s linear infinite;opacity:.06;
  }
  @keyframes gridShift{to{background-position:560px 560px}}
  .lz-card{
    position:relative;z-index:2;width:min(640px,94vw);
    padding:26px 24px 22px;border-radius:22px;
    background:linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7));
    box-shadow:0 8px 25px rgba(56,103,214,0.08),
               inset 0 0 0 1px rgba(255,255,255,0.6),
               inset 0 2px 12px rgba(255,255,255,0.2);
    animation:popIn .6s var(--lz-ease) forwards;
  }
  @keyframes popIn{from{opacity:0;transform:translateY(20px)scale(.95)}to{opacity:1;transform:translateY(0)scale(1)}}
  .lz-accent-line{
    position:absolute;top:0;left:0;width:100%;height:4px;
    background:linear-gradient(90deg,${CFG.accent},${CFG.accent2});
    background-size:200% 100%; animation:slideLine 2.2s linear infinite;border-radius:22px 22px 0 0;
  }
  @keyframes slideLine{to{background-position:200% 0}}
  .lz-logoWrap{
    width:80px;height:80px;border-radius:22px;background:white;overflow:hidden;
    display:grid;place-items:center;margin:auto;position:relative;
    box-shadow:0 10px 30px rgba(56,103,214,0.12),inset 0 0 0 3px rgba(255,255,255,0.5);
    animation:floatLogo 4s ease-in-out infinite alternate;
  }
  .lz-logoWrap::after{
    content:"";position:absolute;inset:-10px;border-radius:26px;
    box-shadow:0 0 0 0 rgba(56,103,214,.3);
    animation:pulseRing 2.8s ease-out infinite;
  }
  @keyframes floatLogo{to{transform:translateY(6px)}}
  @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(56,103,214,.25)}80%{box-shadow:0 0 0 28px rgba(56,103,214,0)}100%{box-shadow:0 0 0 0 rgba(56,103,214,0)}}
  .lz-logo{width:100%;height:100%;object-fit:cover;border-radius:inherit;}
  .lz-title{text-align:center;font:800 1.45rem/1.2 Inter,system-ui;color:#0b1720;margin-top:14px;}
  .lz-sub{text-align:center;font:500 .92rem/1.6 Inter,system-ui;color:#53606d;margin-bottom:16px;}
  .lz-progress{position:relative;height:14px;border-radius:999px;background:rgba(0,0,0,.05);overflow:hidden;}
  .lz-bar{position:absolute;inset:0 100% 0 0;background:linear-gradient(90deg,${CFG.accent},${CFG.accent2});
    background-size:200% 100%;animation:stripe 1.4s linear infinite;transition:width .4s ease;}
  @keyframes stripe{to{background-position:200% 0}}
  .lz-loading-icon{margin:auto;margin-top:12px;width:28px;height:28px;border:3px solid rgba(0,0,0,.1);border-top-color:${CFG.accent};border-radius:50%;animation:spin 1.1s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .lz-tip{text-align:center;margin-top:14px;color:#475569;font:500 .88rem Inter;}
  .lz-pop{opacity:0;transform:translateY(25px)scale(.97);}
  .lz-pop.lz-in{opacity:1;transform:translateY(0)scale(1);
    transition:opacity .7s var(--lz-ease),transform .7s var(--lz-ease);}
  /* --- Post spinner --- */
  .lz-post-spinner{position:relative;border-radius:18px;padding:18px 16px 6px;
    background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.92));
    box-shadow:0 6px 18px rgba(0,0,0,.06),inset 0 0 0 1px rgba(0,0,0,.03);
    overflow:hidden;margin:8px 0;}
  .lz-ps-header{display:flex;align-items:center;gap:12px;padding:2px 4px 14px;}
  .lz-ps-ring svg{width:42px;height:42px;transform:rotate(-90deg);}
  .lz-ps-label{font:600 .95rem Inter;color:#0f172a;}
  .lz-ps-sub{font:500 .82rem Inter;color:#526071;}
  .lz-skel-wrap{display:grid;gap:12px;}
  .lz-skel-card{display:grid;grid-template-columns:48px 1fr 96px;align-items:center;
    gap:12px;padding:12px;border-radius:14px;background:rgba(0,0,0,.035);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.03);}
  .lz-skel-vote,.lz-skel-title,.lz-skel-meta,.lz-skel-thumb{
    position:relative;overflow:hidden;background:rgba(0,0,0,.05);}
  .lz-skel-vote{width:48px;height:72px;border-radius:10px;}
  .lz-skel-title{height:16px;border-radius:8px;margin-bottom:10px;}
  .lz-skel-meta{height:12px;width:60%;border-radius:6px;}
  .lz-skel-thumb{height:64px;border-radius:10px;}
  .lz-shimmer:after{content:"";position:absolute;inset:-1px;transform:translateX(-60%);
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);
    animation:${prefersReduce?"none":"lzShimmer 1.3s ease-in-out infinite"};}
  @keyframes lzShimmer{to{transform:translateX(160%);}}
  .lz-ps-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 4px 8px;}
  .lz-ps-bar{flex:1;height:8px;border-radius:999px;background:rgba(0,0,0,.06);overflow:hidden;margin-right:10px;}
  .lz-ps-bar .bar{width:0%;height:100%;
    background:linear-gradient(90deg,${CFG.accent},${CFG.accent2});
    background-size:200% 100%;
    ${prefersReduce ? "" : "animation: stripe 1.2s linear infinite;"}
    transition:width .35s ${CFG.ease};}
  .lz-ps-msg{font:600 .8rem Inter;color:#334155;}
  .lz-rev{opacity:0;transform:translateY(18px)scale(.98);
    transition:opacity .55s ${CFG.ease},transform .55s ${CFG.ease};}
  .lz-rev.lz-rev-in{opacity:1;transform:translateY(0)scale(1);}
  `;
  document.head.appendChild(css);

  // ==============================================================
  // CINEMATIC LOADER
  // ==============================================================
  const overlay = document.createElement("div");
  overlay.className = "lz-loader";
  overlay.innerHTML = `
    <div class="lz-grid"></div>
    <div class="lz-card">
      <div class="lz-accent-line"></div>
      <div class="lz-logoWrap"><img src="${CFG.logoSrc}" class="lz-logo" alt="Логотип"></div>
      <div class="lz-title">${CFG.brand}</div>
      <div class="lz-sub">Готуємо компоненти інтерфейсу…</div>
      <div class="lz-progress"><div class="lz-bar" id="lz-bar"></div></div>
      <div class="lz-loading-icon"></div>
      <div class="lz-tip" id="lz-tip">Порада: натисніть Tab для швидкого пошуку.</div>
    </div>`;
  document.body.appendChild(overlay);

  const pageBar = overlay.querySelector("#lz-bar");
  let progress = 0;
  const setProgress = p => (pageBar.style.width = Math.min(100, p) + "%");
  const simulate = () => {
    progress += (40 - 5) * 0.01 + Math.random();
    setProgress(progress);
    requestAnimationFrame(simulate);
  };
  requestAnimationFrame(simulate);

  const waitAll = () => {
    const imgs = Array.from(document.images);
    const imgWait = imgs.length
      ? Promise.allSettled(imgs.map(i => new Promise(r => {
          if (i.complete) return r();
          i.addEventListener("load", r, { once: true });
          i.addEventListener("error", r, { once: true });
        })))
      : Promise.resolve();
    const fontWait = ("fonts" in document) ? document.fonts.ready : Promise.resolve();
    return Promise.all([imgWait, fontWait]);
  };

  const markPop = () => {
    const els = Array.from(document.querySelectorAll(`
      .wrap > *, section, aside, footer,
      .contact-card, #modal, #custom-dialog
    `));
    els.forEach(el => el.classList.add("lz-pop"));
  };
  const revealAll = () => {
    const pops = Array.from(document.querySelectorAll(".lz-pop"));
    let d = 0;
    pops.forEach(el => {
      el.style.transitionDelay = d + "ms";
      el.classList.add("lz-in");
      d += CFG.popStagger;
    });
  };

  // ==============================================================
  // POST SPINNER (skeleton loader)
  // ==============================================================
  function buildRing(percent){
    const p = Math.max(0, Math.min(100, percent|0));
    const r = 18, c = 2*Math.PI*r, off = c * (1 - p/100);
    return `<svg viewBox="0 0 42 42">
      <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="4"/>
      <circle cx="21" cy="21" r="${r}" fill="none" stroke="${CFG.accent}" stroke-linecap="round"
      stroke-width="4" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
  }

  async function renderPosts(){
    const list = document.querySelector("#posts-list");
    if(!list) return;
    const posts = Array.from(list.children);
    posts.forEach(el => (el.style.display = "none"));

    const holder = document.createElement("div");
    holder.className = "lz-post-spinner";
    holder.innerHTML = `
      <div class="lz-ps-header">
        <div class="lz-ps-ring" id="lz-ps-ring">${buildRing(0)}</div>
        <div><div class="lz-ps-label" id="lz-ps-label">Завантаження постів…</div>
        <div class="lz-ps-sub" id="lz-ps-sub">Готуємо стрічку для показу</div></div>
      </div>
      <div class="lz-skel-wrap"></div>
      <div class="lz-ps-footer">
        <div class="lz-ps-bar"><div class="bar" id="lz-ps-bar"></div></div>
        <div class="lz-ps-msg" id="lz-ps-msg">0%</div>
      </div>`;
    list.prepend(holder);

    const wrap = holder.querySelector(".lz-skel-wrap");
    const n = Math.max(CFG.skeletonMin, Math.min(CFG.skeletonCountMax, 6));
    for (let i=0;i<n;i++){
      const c = document.createElement("div");
      c.className = "lz-skel-card";
      c.innerHTML = `
        <div class="lz-skel-vote lz-shimmer"></div>
        <div><div class="lz-skel-title lz-shimmer"></div>
        <div class="lz-skel-meta lz-shimmer" style="width:${60+Math.random()*25}%"></div></div>
        <div class="lz-skel-thumb lz-shimmer"></div>`;
      wrap.appendChild(c);
    }

    const ring = holder.querySelector("#lz-ps-ring");
    const bar = holder.querySelector("#lz-ps-bar");
    const msg = holder.querySelector("#lz-ps-msg");

    let prog = 0;
    const totalTime = CFG.postSpinnerDuration;
    const start = performance.now();

    function update(){
      const elapsed = performance.now() - start;
      prog = Math.min(100, (elapsed / totalTime) * 100);
      ring.innerHTML = buildRing(prog);
      bar.style.width = prog + "%";
      msg.textContent = prog.toFixed(0) + "%";
      if(prog < 100) requestAnimationFrame(update);
      else finish();
    }

    function finish(){
      holder.remove();
      posts.forEach((el, i) => {
        el.style.display = "";
        el.classList.add("lz-rev");
        el.style.transitionDelay = (i * CFG.revealDelayMs) + "ms";
        requestAnimationFrame(() => el.classList.add("lz-rev-in"));
      });
    }

    requestAnimationFrame(update);
  }

  // ==============================================================
  // INIT
  // ==============================================================
  (async function init(){
    markPop();
    await Promise.all([
      waitAll(),
      new Promise(r=>setTimeout(r, CFG.mainLoaderDuration))
    ]);
    setProgress(100);
    overlay.classList.add("lz-hidden");
    await new Promise(r=>setTimeout(r, CFG.fadeMs));
    overlay.remove();
    if(!prefersReduce) revealAll();
    renderPosts();
  })();
})();
