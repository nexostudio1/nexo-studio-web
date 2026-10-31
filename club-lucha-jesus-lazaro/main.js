(function () {
  "use strict";
  /* Club de Lucha Jesús Lázaro — main.js (IIFE, sin módulos) */

  document.documentElement.classList.add("js");

  var data = window.__BRAND__ || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* Un único bucle de scroll para todo (rAF) */
  var scrollFns = [];
  function onScroll(fn) { scrollFns.push(fn); }
  function initScrollLoop() {
    var ticking = false;
    function run() { ticking = false; for (var i = 0; i < scrollFns.length; i++) scrollFns[i](); }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    window.addEventListener("resize", run);
    run();
  }

  /* ---------- Datos de contacto ---------- */
  function applyContact() {
    var c = data.contact;
    if (c) {
      var addr = $('[data-c="address"]');
      if (addr && c.address) addr.textContent = c.address;
      var phone = $('[data-c="phone"]');
      if (phone && c.phone) { phone.textContent = c.phone; phone.href = "tel:" + c.phone.replace(/[^\d+]/g, ""); }
      var mail = $('[data-c="email"]');
      if (mail && c.email) { mail.textContent = c.email; mail.href = "mailto:" + c.email; }
      var ig = $('[data-c="instagram"]');
      if (ig && c.instagram) { ig.textContent = "@" + c.instagram; ig.href = "https://www.instagram.com/" + c.instagram + "/"; }
    }
    var y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- Nav: fondo al hacer scroll + menú móvil ---------- */
  function initNav() {
    var nav = $("[data-nav]"), btn = $("[data-burger]"), menu = $("[data-menu]");
    if (nav) onScroll(function () { nav.classList.toggle("is-solid", window.scrollY > 40); });
    if (!btn || !menu) return;
    function set(open) {
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      document.body.style.overflow = open ? "hidden" : "";
    }
    btn.addEventListener("click", function () { set(!menu.classList.contains("is-open")); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) set(false); });
  }

  /* ---------- Reveals ---------- */
  function initReveals() {
    var els = $$(".reveal:not([data-split])");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------- Manifiesto: palabras que se encienden con el scroll ---------- */
  function initWords() {
    var el = $("[data-words]");
    if (!el || el.dataset.wordsBound) return;
    el.dataset.wordsBound = "1";
    var text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.innerHTML = text.split(" ").map(function (w) {
      var span = document.createElement("span");
      span.className = "w"; span.setAttribute("aria-hidden", "true"); span.textContent = w;
      return span.outerHTML;
    }).join(" ");
    var words = $$(".w", el);
    onScroll(function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.25);
      p = Math.max(0, Math.min(1, p));
      var n = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("on", i < n);
    });
  }

  /* ---------- Contadores ---------- */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, end = parseInt(el.dataset.count, 10) || 0, suf = el.dataset.suffix || "";
        var t0 = performance.now(), dur = 1200;
        (function tick(now) {
          var p = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Marcador: cronómetro de periodo (3:00 → 0:00) ---------- */
  function initClock() {
    var el = $("[data-clock]");
    if (!el) return;
    var total = 180, left = total;
    setInterval(function () {
      left = left <= 0 ? total : left - 1;
      var m = Math.floor(left / 60), s = left % 60;
      el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    }, 1000);
  }

  /* ---------- Indicador de periodo (sección actual + progreso) ---------- */
  function initPeriod() {
    var box = $("[data-period]"), label = $("[data-period-label]"), bar = $("[data-period-bar]");
    if (!box || !label || !bar) return;
    var map = [
      ["#manifiesto", "01 · El club"],
      ["#disciplinas", "02 · Disciplinas"],
      ["#puntos", "03 · El combate"],
      ["#horarios", "04 · Horarios"],
      ["#tarifas", "05 · Tarifas"],
      ["#faq", "06 · Dudas"],
      ["#contacto", "07 · Contacto"]
    ].map(function (m) { return { el: $(m[0]), txt: m[1] }; }).filter(function (m) { return m.el; });
    var hero = $(".hero");
    onScroll(function () {
      var y = window.scrollY, vh = window.innerHeight;
      var max = document.documentElement.scrollHeight - vh;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      box.classList.toggle("is-on", !!hero && y > hero.offsetHeight * 0.6);
      var cur = map[0];
      for (var i = 0; i < map.length; i++) if (map[i].el.getBoundingClientRect().top < vh * 0.5) cur = map[i];
      if (cur && label.textContent !== cur.txt) label.textContent = cur.txt;
    });
  }

  /* ---------- Pestañas de horario (móvil) ---------- */
  function initTabs() {
    var wrap = $("[data-tabs]");
    if (!wrap) return;
    var tabs = $$("[role=tab]", wrap);
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.classList.toggle("is-active", on);
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n);
      });
    });
    // Abre el día de hoy (lunes por defecto el domingo)
    var idx = Math.max(0, Math.min(5, (new Date().getDay() + 6) % 7));
    select(tabs[idx] || tabs[0]);
  }

  /* ---------- Botones magnéticos ---------- */
  function initMagnetic() {
    if (!canHover) return;
    $$("[data-magnetic]").forEach(function (b) {
      var inner = b.querySelector("span");
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2), y = (e.clientY - r.top - r.height / 2);
        b.style.transform = "translate(" + x * 0.18 + "px," + y * 0.3 + "px)";
        if (inner) inner.style.transform = "translate(" + x * 0.08 + "px," + y * 0.12 + "px)";
      });
      b.addEventListener("mouseout", function (e) {
        if (b.contains(e.relatedTarget)) return;
        b.style.transform = ""; if (inner) inner.style.transform = "";
      });
    });
  }

  /* ---------- Formulario → WhatsApp o email ---------- */
  function initForm() {
    var form = $("[data-form]"), msg = $("[data-form-msg]");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$("[required]", form).forEach(function (f) {
        var bad = !f.value.trim();
        f.classList.toggle("is-invalid", bad);
        if (bad) ok = false;
      });
      if (!ok) { if (msg) msg.textContent = "Necesitamos tu nombre y un teléfono para llamarte."; return; }
      var fd = new FormData(form);
      var text = "Hola, quiero una clase de prueba en el Club de Lucha Jesús Lázaro.\n" +
        "Nombre: " + fd.get("nombre") + "\nTeléfono: " + fd.get("telefono") + "\nMe interesa: " + fd.get("disciplina") +
        (String(fd.get("mensaje") || "").trim() ? "\nMensaje: " + fd.get("mensaje") : "");
      var c = data.contact || {};
      var url = c.whatsapp
        ? "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(text)
        : "mailto:" + (c.email || "") + "?subject=" + encodeURIComponent("Clase de prueba") + "&body=" + encodeURIComponent(text);
      if (msg) msg.textContent = c.whatsapp ? "Abriendo WhatsApp…" : "Abriendo tu correo…";
      window.location.href = url;
    });
  }

  /* ---------- GSAP: parallax de imágenes ---------- */
  function initParallax() {
    var hero = $("[data-hero-img]");
    if (hero) {
      gsap.to(hero, { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }
    $$("[data-parallax]").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: img.closest("section"), start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  function boot() {
    safe(applyContact, "applyContact");
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initWords, "initWords");
    safe(initCounters, "initCounters");
    safe(initClock, "initClock");
    safe(initPeriod, "initPeriod");
    safe(initTabs, "initTabs");
    safe(initMagnetic, "initMagnetic");
    safe(initForm, "initForm");
    safe(initScrollLoop, "initScrollLoop");
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initParallax, "initParallax");
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
