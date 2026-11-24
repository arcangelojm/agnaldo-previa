/* main.js
   JS mínimo: mega menu (intenção de hover, clique, teclado), menu mobile,
   pausa da faixa de provas e formulários (origem, máscara, validação, envio a /api/lead e fallback para WhatsApp).
   Todo o conteúdo e todos os links funcionam sem JavaScript.

   Dados do cliente NÃO ficam neste arquivo. Vêm de atributos data- do <body> de cada página:
     data-whatsapp="5565999999999"           só dígitos com DDI e DDD (fallback do formulário e mensagem de falha)
     data-whatsapp-visivel="(65) 99999-9999"  opcional, telefone mostrado na mensagem de falha
     data-empresa="Nome da Empresa"           opcional, saudação da mensagem pré-preenchida do WhatsApp
   Se data-whatsapp faltar, a mensagem de falha aparece sem link. */
(function () {
  "use strict";
  var corpo = document.body, WHATSAPP = (corpo.getAttribute("data-whatsapp") || "").replace(/\D/g, "");
  var TELEFONE = corpo.getAttribute("data-whatsapp-visivel") || "", EMPRESA = corpo.getAttribute("data-empresa") || "";

  /* ---------- mega menu ---------- */
  document.querySelectorAll(".has-mega").forEach(function (item) {
    var trigger = item.querySelector("[data-mega-trigger]"), panel = item.querySelector(".mega"), timer;
    if (!trigger || !panel) return;
    var open = function (on) {
      if (on) document.querySelectorAll(".has-mega").forEach(function (outro) {
        if (outro === item) return;
        var t = outro.querySelector("[data-mega-trigger]"), p = outro.querySelector(".mega");
        if (t && p) { t.setAttribute("aria-expanded", "false"); p.setAttribute("data-open", "false"); }
      });
      trigger.setAttribute("aria-expanded", String(on)); panel.setAttribute("data-open", String(on));
    };
    var desktop = function () { return window.matchMedia("(min-width: 1024px)").matches; };
    item.addEventListener("mouseenter", function () { clearTimeout(timer); if (desktop() && window.matchMedia("(hover: hover)").matches) open(true); });
    item.addEventListener("mouseleave", function () { clearTimeout(timer); if (!desktop()) return; timer = setTimeout(function () { open(false); }, 220); });
    trigger.addEventListener("click", function (e) { e.preventDefault(); clearTimeout(timer); open(panel.getAttribute("data-open") !== "true"); });
    item.addEventListener("keydown", function (e) { if (e.key === "Escape") { open(false); trigger.focus(); } });
    item.addEventListener("focusout", function () { setTimeout(function () { if (desktop() && !item.contains(document.activeElement)) open(false); }, 0); });
  });

  /* ---------- menu mobile (drawer) ---------- */
  var navBtn = document.querySelector("[data-nav-toggle]"), nav = document.getElementById("menu-principal");
  if (navBtn && nav) {
    var header = document.querySelector(".site-header");
    var setNav = function (on) {
      navBtn.setAttribute("aria-expanded", String(on));
      navBtn.setAttribute("aria-label", on ? "Fechar o menu" : "Abrir o menu");
      nav.setAttribute("data-open", String(on));
      document.body.classList.toggle("is-locked", on);
      if (on && header) nav.style.setProperty("--nav-top", header.getBoundingClientRect().bottom + "px");
      // contenção de foco (WCAG 2.4.3 e 2.4.11): com o menu aberto, só o header e o menu recebem foco e leitura
      document.querySelectorAll("main, footer, .topbar, .wa-float, .skip-link, .cookie-banner").forEach(function (el) {
        el.inert = on;
        if (on) el.setAttribute("aria-hidden", "true"); else el.removeAttribute("aria-hidden");
      });
      if (on) { var primeiro = nav.querySelector("a, button"); if (primeiro) primeiro.focus(); }
    };
    navBtn.addEventListener("click", function () { setNav(nav.getAttribute("data-open") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.getAttribute("data-open") === "true") { setNav(false); navBtn.focus(); }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (m) { if (m.matches) setNav(false); });
  }

  /* ---------- faixa aqua: pausa (WCAG 2.2.2) ---------- */
  document.querySelectorAll("[data-marquee-pause]").forEach(function (btn) {
    var strip = btn.closest(".trust-strip");
    btn.addEventListener("click", function () {
      var paused = strip.getAttribute("data-paused") === "true";
      strip.setAttribute("data-paused", String(!paused));
      btn.setAttribute("aria-pressed", String(!paused));
      btn.setAttribute("aria-label", paused ? "Pausar a faixa de provas" : "Retomar a faixa de provas");
    });
  });

  /* ---------- formulários: origem, máscara, validação, envio e erros ---------- */
  var UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var digits = function (v) { return (v || "").replace(/\D/g, ""); };
  var celularValido = function (v) { var d = digits(v).replace(/^0+/, ""); if (d.length === 13 && d.indexOf("55") === 0) d = d.slice(2); return d.length === 11 && d.charAt(2) === "9"; };
  var limpaUrl = function (u) { try { var x = new URL(u, window.location.href); return x.origin + x.pathname; } catch (e) { return ""; } };
  var ehHttp = /^https?:/;

  /* Origem da visita: entrada, referência e UTMs ficam só na sessão (sessionStorage) e vão em campos ocultos do POST, nunca na URL. */
  var origem = (function () {
    var o = {};
    try { o = JSON.parse(sessionStorage.getItem("site-origem") || "{}") || {}; } catch (e) { o = {}; }
    if (!o.landing_page) { o.landing_page = limpaUrl(window.location.href); o.referrer = document.referrer ? limpaUrl(document.referrer) : ""; }
    var q = new URLSearchParams(window.location.search);
    UTMS.forEach(function (k) { var v = q.get(k); if (v) o[k] = v.slice(0, 120); });
    try { sessionStorage.setItem("site-origem", JSON.stringify(o)); } catch (e) {}
    return o;
  })();
  var abertura = Date.now();

  function preencherOcultos(form) {
    var set = function (n, v) { var c = form.elements[n]; if (c && v) c.value = v; };
    set("pagina_origem", limpaUrl(window.location.href));
    set("landing_page", ehHttp.test(origem.landing_page || "") ? origem.landing_page : "");
    set("referrer", ehHttp.test(origem.referrer || "") ? origem.referrer : "");
    UTMS.forEach(function (k) { set(k, origem[k]); });
    set("ts", String(abertura));
  }

  function mascaraCelular(v) {
    var d = digits(v).replace(/^0+/, ""); /* zero de longa distância antes do DDD */
    if (d.indexOf("55") === 0 && d.length > 11) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length > 7) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length > 2) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    return d.length ? "(" + d : "";
  }

  var mensagens = {
    nome: "Informe seu nome para sabermos como chamar você.",
    telefone: "Informe o celular com DDD, por exemplo (65) 99999-9999.",
    email: "Informe um e-mail válido, como nome@exemplo.com.br.",
    servico: "Escolha a peça ou o serviço que você precisa.",
    consentimento: "Marque a autorização para respondermos pelo WhatsApp."
  };

  function caixaErro(campo) {
    var ids = campo.getAttribute("aria-describedby");
    return ids ? document.getElementById(ids.split(" ")[0]) : null;
  }

  /* UX2-04 e UX3-07: detalhes opcionais do formulário do topo; saem fechados do HTML, abrem no clique ou se um campo deles tiver erro */
  var maisAbrir = function (btn, on) {
    var alvo = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", String(on));
    if (alvo) alvo.hidden = !on;
  };
  document.querySelectorAll("[data-form-mais]").forEach(function (btn) {
    btn.addEventListener("click", function () { maisAbrir(btn, btn.getAttribute("aria-expanded") !== "true"); });
  });

  function erro(campo, on, texto) {
    var box = caixaErro(campo);
    if (on) { var bloco = campo.closest && campo.closest(".form-mais"); var b = bloco && bloco.querySelector("[data-form-mais]"); if (b) maisAbrir(b, true); }
    campo.setAttribute("aria-invalid", String(on));
    if (box) {
      box.classList.toggle("is-visible", on);
      var txt = box.querySelector("[data-msg]");
      if (txt) txt.textContent = on ? (texto || mensagens[campo.name] || (campo.tagName === "SELECT" ? "Escolha uma das opções." : "Revise este campo.")) : "";
    }
  }

  /* Mensagem do celular conforme o que falta (teste de 18/11/2026: quem digita o número antigo, sem o 9, já pôs o DDD). */
  function msgCelular(v) {
    var d = digits(v).replace(/^0+/, "");
    if (d.length === 13 && d.indexOf("55") === 0) d = d.slice(2);
    if (d.length === 10) return "Confira o número: o celular tem 9 dígitos depois do DDD, como (65) 99999-9999.";
    if (d.length >= 8 && d.length <= 9) return "Inclua o DDD antes do número, como (65) 99999-9999.";
    return mensagens.telefone;
  }

  /* Leva o campo com erro para o meio da tela: no celular o aviso de cookies cobre a parte de baixo e escondia a mensagem. */
  function focarErro(campo) {
    try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); }
    if (campo.scrollIntoView) campo.scrollIntoView({ block: "center" });
  }

  function invalido(c) {
    if (c.type === "checkbox") return !c.checked;
    var v = (c.value || "").trim();
    if (c.name === "telefone") return !celularValido(v);
    if (c.type === "email") return v !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return c.required ? !v : false;
  }

  function validar(form) {
    var primeiro = null;
    form.querySelectorAll("[data-validar]").forEach(function (campo) {
      var ruim = invalido(campo);
      erro(campo, ruim, ruim && campo.name === "telefone" ? msgCelular(campo.value) : undefined);
      if (ruim && !primeiro) primeiro = campo;
    });
    if (primeiro) focarErro(primeiro);
    return !primeiro;
  }

  function textoWhatsApp(form) {
    var d = new FormData(form), partes = ["Olá" + (EMPRESA ? ", " + EMPRESA : "") + "! Quero pedir um orçamento."];
    if (d.get("nome")) partes.push("Nome: " + d.get("nome"));
    if (d.get("servico")) partes.push("Serviço: " + d.get("servico"));
    if (d.get("bairro")) partes.push("Bairro: " + d.get("bairro"));
    form.querySelectorAll("select[name^=esp_]").forEach(function (s) {
      var rot = s.closest(".field") && s.closest(".field").querySelector("label");
      if (s.value && rot) partes.push(rot.firstChild.textContent.trim() + ": " + s.value);
    });
    if (d.get("mensagem")) partes.push("Detalhes: " + d.get("mensagem"));
    partes.push("Posso enviar fotos da peça?");
    return WHATSAPP ? "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(partes.join("\n")) : "";
  }

  function mostrarFalha(form, status, mensagem, zapUrl) {
    if (!status) return;
    var p = status.querySelector("p");
    if (p) {
      var destino = zapUrl || textoWhatsApp(form);
      p.textContent = (mensagem || "Não conseguimos registrar o pedido agora.") + " Seus dados continuam preenchidos" + (destino ? ": " : ".");
      if (destino) {
        var a = document.createElement("a");
        a.href = destino; a.rel = "noopener"; a.textContent = "continuar o pedido pelo WhatsApp";
        p.appendChild(a);
        p.appendChild(document.createTextNode(TELEFONE ? " ou ligue para " + TELEFONE + "." : "."));
      }
    }
    status.classList.add("is-visible");
    status.setAttribute("tabindex", "-1");
    status.focus({ preventScroll: true });
    if (status.scrollIntoView) status.scrollIntoView({ block: "nearest" });
  }

  document.querySelectorAll("form[data-lead-form]").forEach(function (form) {
    preencherOcultos(form);
    var enviando = false;
    var tel = form.elements.telefone;
    if (tel) tel.addEventListener("input", function () { var m = mascaraCelular(tel.value); if (m !== tel.value) tel.value = m; });
    /* Erros só aparecem ao enviar e somem assim que o campo fica válido (input/change). Não validamos no blur:
       um erro que aparece ou some no meio do clique desloca o layout e faz o clique seguinte errar o alvo. */
    form.querySelectorAll("[data-validar]").forEach(function (campo) {
      var ev = campo.type === "checkbox" || campo.tagName === "SELECT" ? "change" : "input";
      campo.addEventListener(ev, function () { if (campo.getAttribute("aria-invalid") === "true") { var r = invalido(campo); erro(campo, r, r && campo.name === "telefone" ? msgCelular(campo.value) : undefined); } });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (enviando || !validar(form)) return;
      var btn = form.querySelector("[type=submit]"), status = form.querySelector("[data-form-status]");
      var rotulo = btn ? btn.innerHTML : "";
      if (status) status.classList.remove("is-visible");
      enviando = true;
      if (btn) { btn.disabled = true; btn.classList.add("is-loading"); btn.setAttribute("aria-busy", "true"); btn.textContent = "Enviando seu pedido"; }
      var fim = function () {
        enviando = false;
        if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy"); btn.innerHTML = rotulo; }
      };
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var limite = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, json: j }; }); })
        .then(function (res) {
          clearTimeout(limite);
          var j = res.json || {};
          if (res.status === 200 && j.ok) {
            try {
              var d = new FormData(form);
              sessionStorage.setItem("site-pedido", JSON.stringify({ nome: ((d.get("nome") || "") + "").trim().split(" ")[0], servico: d.get("servico") || "", form_id: d.get("form_id") || "", evento: true }));
            } catch (er) {}
            window.location.href = "/agnaldo-previa/obrigado/";
            return;
          }
          fim();
          if (res.status === 422 && j.errors) {
            var primeiro = null;
            Object.keys(j.errors).forEach(function (n) {
              var c = form.elements[n];
              if (c && c.setAttribute) { erro(c, true, j.errors[n]); if (!primeiro) primeiro = c; }
            });
            if (primeiro) { focarErro(primeiro); return; }
          }
          mostrarFalha(form, status, j.message, j.whatsappUrl);
        })
        .catch(function () { clearTimeout(limite); fim(); mostrarFalha(form, status, "Não conseguimos falar com o servidor agora.", null); });
    });
  });
  /* voltar pelo histórico (bfcache): botões liberados */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    document.querySelectorAll("form[data-lead-form] [type=submit]").forEach(function (b) { b.disabled = false; b.classList.remove("is-loading"); b.removeAttribute("aria-busy"); });
  });
})();
