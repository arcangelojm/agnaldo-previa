/* consent.js
   Consent Mode v2 com padrão NEGADO. Carregado no <head>, antes de qualquer tag de medição.
   Restaura a escolha salva (localStorage "site-consent", válida por 12 meses e por versão).
   A interface do aviso e o carregamento de GA4, Clarity e pixel estão em cookies.js. */
(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  /* Identificadores de medição, lidos do <body> quando forem usados (este script roda no <head>, antes do <body> existir):
     data-ga4="G-XXXXXXXXXX", data-clarity="id" e data-pixel="id" (opcional). Atributo ausente ou vazio = a ferramenta não carrega.
     Os IDs são públicos por natureza; nenhum segredo entra aqui. */
  function dado(nome) { return function () { return (document.body && document.body.getAttribute(nome)) || ""; }; }
  var IDS = {};
  Object.defineProperty(IDS, "ga4", { get: dado("data-ga4"), enumerable: true });
  Object.defineProperty(IDS, "clarity", { get: dado("data-clarity"), enumerable: true });
  Object.defineProperty(IDS, "pixel", { get: dado("data-pixel"), enumerable: true });
  var KEY = "site-consent", VERSAO = 1, VALIDADE = 365 * 864e5;

  function ler() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.v === VERSAO && Date.now() - o.t < VALIDADE) return o;
    } catch (e) {}
    return null;
  }
  function estados(o) {
    var a = o.analytics ? "granted" : "denied";
    /* sinais de anúncio ao usuário só são concedidos se houver ferramenta de marketing configurada (pixel) */
    var u = o.marketing && IDS.pixel ? "granted" : "denied";
    return { analytics_storage: a, ad_storage: u, ad_user_data: u, ad_personalization: u };
  }

  gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied",
    functionality_storage: "granted", security_storage: "granted", wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);

  var salvo = ler();
  if (salvo) gtag("consent", "update", estados(salvo));

  window.siteConsent = { IDS: IDS, KEY: KEY, VERSAO: VERSAO, ler: ler, estados: estados };
})();
