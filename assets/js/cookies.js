/* cookies.js
   Aviso de cookies (LGPD) sem biblioteca externa: Aceitar todos, Recusar e Personalizar com o mesmo destaque.
   Categorias: necessários (sempre), análise (GA4 e Clarity) e marketing (pixel e sinais de anúncio).
   Nada de medição carrega antes do aceite; o padrão negado do Consent Mode v2 está em consent.js.
   A escolha é salva em localStorage e pode ser alterada pelo link "Preferências de cookies" do rodapé. */
(function () {
  "use strict";
  window.siteEventos = window.siteEventos || [];
  var C = window.siteConsent, gtag = window.gtag, IDS = C && C.IDS;
  var banner = document.getElementById("aviso-cookies"), dlg = document.getElementById("preferencias-cookies"), live = document.getElementById("cookie-live");
  if (!C || !IDS || !gtag || !banner || !dlg) return;

  var carregado = {};
  function script(src, extra) {
    var s = document.createElement("script"); s.async = true; s.src = src;
    if (extra) Object.keys(extra).forEach(function (k) { s[k] = extra[k]; });
    document.head.appendChild(s);
  }

  function carregarGA4() {
    if (carregado.ga4 || !IDS.ga4) return; carregado.ga4 = true;
    script("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(IDS.ga4));
    gtag("js", new Date());
    gtag("config", IDS.ga4);
    /* eventos de conversão da sessão (ex.: generate_lead do /obrigado/) só saem depois do config e com consentimento de análise */
    var fila = window.siteEventos; window.siteEventos = { push: function (e) { gtag("event", e.name, e.params); } };
    fila.forEach(function (e) { window.siteEventos.push(e); });
  }
  function carregarClarity() {
    if (!IDS.clarity) return;
    if (!carregado.clarity) {
      carregado.clarity = true;
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      script("https://www.clarity.ms/tag/" + encodeURIComponent(IDS.clarity));
    }
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  }
  function carregarPixel() {
    if (!IDS.pixel) return;
    if (!carregado.pixel) {
      carregado.pixel = true;
      var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
      f("consent", "revoke");
      script("https://connect.facebook.net/en_US/fbevents.js");
      f("init", IDS.pixel);
      f("track", "PageView");
    }
    window.fbq("consent", "grant");
  }

  function apagarCookies(re) {
    var host = location.hostname, partes = host.split("."), dominios = [host, "." + host];
    if (partes.length > 2) dominios.push("." + partes.slice(-3).join("."), "." + partes.slice(-2).join("."));
    else dominios.push("." + partes.slice(-2).join("."));
    document.cookie.split(";").forEach(function (c) {
      var nome = c.split("=")[0].trim();
      if (!re.test(nome)) return;
      dominios.forEach(function (d) { document.cookie = nome + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + d; });
      document.cookie = nome + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    });
  }

  function aplicar(o, mudou) {
    gtag("consent", "update", C.estados(o));
    if (o.analytics) { carregarGA4(); carregarClarity(); }
    else { if (mudou) apagarCookies(/^(_ga.*|_gid|_gat.*|_clck|_clsk|CLID|SM)$/); if (window.clarity) window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" }); }
    if (o.marketing) carregarPixel();
    else { if (mudou) apagarCookies(/^(_fbp|_fbc)$/); if (window.fbq) window.fbq("consent", "revoke"); }
  }

  /* ---------- aviso (não modal: a leitura e a rolagem continuam livres) ---------- */
  var origemFoco = null;
  function altura() { document.documentElement.style.setProperty("--aviso-altura", banner.hidden ? "0px" : banner.offsetHeight + "px"); }
  function mostrarAviso() {
    banner.hidden = false; document.body.classList.add("tem-aviso-cookies"); altura();
    if (window.ResizeObserver) new ResizeObserver(altura).observe(banner);
    window.addEventListener("resize", altura);
    origemFoco = document.activeElement;
  }
  function fecharAviso() {
    banner.hidden = true; document.body.classList.remove("tem-aviso-cookies"); altura();
  }
  function avisar(txt) { if (live) { live.textContent = ""; setTimeout(function () { live.textContent = txt; }, 50); } }

  function salvar(o, txt) {
    o.v = C.VERSAO; o.t = Date.now();
    try { localStorage.setItem(C.KEY, JSON.stringify(o)); } catch (e) {}
    aplicar(o, true);
    fecharAviso();
    if (dlg.open) dlg.close();
    avisar(txt);
    if (origemFoco && document.contains(origemFoco) && origemFoco !== document.body) { try { origemFoco.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- preferências (dialog nativo: foco preso, Esc fecha, foco volta ao link do rodapé) ---------- */
  function abrirPreferencias() {
    var atual = C.ler() || { analytics: false, marketing: false };
    dlg.querySelector("[data-cookie-cat=analytics]").checked = !!atual.analytics;
    dlg.querySelector("[data-cookie-cat=marketing]").checked = !!atual.marketing;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function fecharPreferencias() { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }

  document.addEventListener("click", function (e) {
    var gatilho = e.target.closest("[data-cookie-prefs]");
    if (gatilho) { e.preventDefault(); abrirPreferencias(); return; }
    var btn = e.target.closest("[data-cookie-acao]");
    if (btn) {
      var acao = btn.getAttribute("data-cookie-acao");
      if (acao === "aceitar") salvar({ analytics: true, marketing: true }, "Você aceitou todos os cookies.");
      else if (acao === "recusar") salvar({ analytics: false, marketing: false }, "Você recusou os cookies de análise e de marketing.");
      else if (acao === "personalizar") abrirPreferencias();
      else if (acao === "salvar") salvar({
        analytics: dlg.querySelector("[data-cookie-cat=analytics]").checked,
        marketing: dlg.querySelector("[data-cookie-cat=marketing]").checked
      }, "Suas preferências de cookies foram salvas.");
      else if (acao === "fechar") fecharPreferencias();
      return;
    }
    if (e.target === dlg) fecharPreferencias();   /* clique no fundo */
  });

  var salvo = C.ler();
  if (salvo) aplicar(salvo, false); else mostrarAviso();
})();
