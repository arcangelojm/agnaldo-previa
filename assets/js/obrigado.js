/* obrigado.js (só em /obrigado/)
   Personaliza a página com o primeiro nome e o serviço guardados em sessionStorage pelo main.js ("site-pedido"). O número do WhatsApp vem de <body data-whatsapp>.
   Nunca lê dado pessoal da URL. Aberta direto (sem pedido na sessão), a página fica na versão genérica e não dispara evento.
   Após envio real, enfileira UMA vez gtag("event", "generate_lead", {service_name, form_id, send_to}) sem dado pessoal; cookies.js envia após o config e só com consentimento. */
(function () {
  "use strict";
  var msg = document.querySelector("[data-obrigado-msg]");
  if (!msg) return;

  var pedido = {};
  try { pedido = JSON.parse(sessionStorage.getItem("site-pedido") || "{}") || {}; } catch (e) { pedido = {}; }
  var nome = String(pedido.nome || "").trim().split(" ")[0].slice(0, 40);
  var servico = String(pedido.servico || "").trim().slice(0, 80);

  var dados = null;
  try { dados = JSON.parse(document.getElementById("obrigado-dados").textContent); } catch (e) { dados = null; }
  var chave = dados && dados.mapa ? dados.mapa[servico] : null;
  var d = chave && dados.dados ? dados.dados[chave] : null;

  var el = function (tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; };
  var icones = document.getElementById("ob-icones");
  var icone = function (nomeIcone) {
    var m = icones && icones.content.querySelector('[data-lucide="' + nomeIcone + '"]');
    return m ? m.cloneNode(true) : null;
  };

  if (nome) { var sn = msg.querySelector("[data-obrigado-nome]"); if (sn) sn.textContent = ", " + nome; }
  if (d) {
    var ss = msg.querySelector("[data-obrigado-servico]"); if (ss) ss.textContent = " de " + servico.toLowerCase();

    var titulo = document.querySelector('[data-ob="etapas-titulo"]'); if (titulo) titulo.textContent = d.titulo_etapas;
    var etapas = document.querySelector('[data-ob="etapas"]');
    if (etapas) {
      etapas.textContent = "";
      d.etapas.forEach(function (e) { var li = el("li"); li.appendChild(el("h3", "", e.t)); li.appendChild(el("p", "", e.d)); etapas.appendChild(li); });
    }
    var prazo = document.querySelector('[data-ob="prazo-servico"]'); if (prazo) prazo.textContent = " " + d.prazo;

    var pt = document.querySelector('[data-ob="preparar-titulo"]'); if (pt) pt.textContent = d.preparar_titulo;
    var prep = document.querySelector('[data-ob="preparar"]');
    if (prep) {
      prep.textContent = "";
      d.preparar.forEach(function (p) {
        var li = el("li"), ico = el("span", "check-ico"), corpo = el("span"), ic = icone("circle-check");
        if (ic) ico.appendChild(ic);
        corpo.appendChild(el("strong", "", p.t)); corpo.appendChild(el("span", "", p.d));
        li.appendChild(ico); li.appendChild(corpo); prep.appendChild(li);
      });
    }

    var wa = document.querySelector('[data-ob="wa"]');
    var zap = (document.body.getAttribute("data-whatsapp") || "").replace(/\D/g, ""); /* número vem do <body data-whatsapp>, nunca do JS */
    if (wa && zap) wa.href = "https://wa.me/" + zap + "?text=" + encodeURIComponent(d.wa);

    var grade = document.querySelector('[data-ob="artigos"]');
    if (grade) {
      grade.textContent = "";
      d.artigos.forEach(function (a) {
        var card = el("article", "post-card"), fig = el("figure", "media media--16x9"), img = el("img");
        img.src = "/assets/img/" + a.img + ".webp";
        img.srcset = "/assets/img/" + a.img + "-480.webp 480w, /assets/img/" + a.img + "-768.webp 768w, /assets/img/" + a.img + ".webp 1200w";
        img.sizes = "(min-width:1024px) 560px, 100vw"; img.width = 800; img.height = 450; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
        fig.appendChild(img);
        var corpo = el("div", "post-card__body"), h3 = el("h3"), link = el("a", "", a.titulo), cl = el("span", "card-link", "Ler o guia"), seta = icone("arrow-right");
        link.href = a.url; h3.appendChild(link);
        cl.setAttribute("aria-hidden", "true"); if (seta) cl.appendChild(seta);
        corpo.appendChild(el("span", "badge", a.badge)); corpo.appendChild(h3); corpo.appendChild(el("p", "", a.texto)); corpo.appendChild(cl);
        card.appendChild(fig); card.appendChild(corpo); grade.appendChild(card);
      });
    }
  }

  /* evento de conversão: só após envio real, uma única vez por pedido, sem dado pessoal */
  if (pedido.evento === true) {
    /* fila lida por cookies.js: o gtag("event") só sai depois do gtag("config"), e só se houver consentimento de análise */
    window.siteEventos = window.siteEventos || [];
    var ga4 = window.siteConsent && window.siteConsent.IDS ? window.siteConsent.IDS.ga4 : "";
    var params = { service_name: servico || "nao_informado", form_id: String(pedido.form_id || "") };
    if (ga4) params.send_to = ga4;
    window.siteEventos.push({ name: "generate_lead", params: params });
    pedido.evento = false;
    try { sessionStorage.setItem("site-pedido", JSON.stringify(pedido)); } catch (e) {}
  }
})();
