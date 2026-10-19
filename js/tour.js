(async function () {
    const $ = id => document.getElementById(id);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
    const def = o => { Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; };
    const falla = m => { const c = $("estadoCarga"); c.classList.remove("oculto", "fuera"); c.classList.add("error"); $("cargaMsg").textContent = m; $("cargaSub").textContent = "Vuelve al catálogo e inténtalo de nuevo."; };
    const ocultarCarga = () => { const c = $("estadoCarga"); c.classList.add("fuera"); setTimeout(() => c.classList.add("oculto"), 500); };
    let cat;
    try { cat = await cargarCatalogo(true); } catch (e) { return falla("No se pudo leer el Excel en línea: " + e.message); }
    const p = cat.proyectos.find(x => x.idProyecto === new URLSearchParams(location.search).get("id"));
    if (!p) return falla("Este recorrido no existe o está desactivado (columna activo).");
    if (!p.escenas.length) return falla("Este proyecto no tiene escenas activas con imagen360 en la hoja Escenas.");
    const wa = (tel, msg) => "https://wa.me/" + tel + "?text=" + encodeURIComponent(msg || "");
    const telGen = p.whatsapp || cat.cli.whatsappGeneral || "";
    document.title = (p.nombreProyecto || p.idProyecto) + " | " + (cat.cli.nombreCliente || "Catálogo 360");

    // Marca del proyecto
    $("nomP").textContent = p.nombreProyecto || ""; $("subP").textContent = p.subtituloProyecto || "";
    const lg = p.logoProyecto || cat.cli.logoCliente;
    if (lg) { $("logoP").src = drive(lg); $("logoP").classList.remove("oculto"); }

    // Paneles (solo uno abierto)
    const paneles = ["panelMapa", "panelInfo", "menuWA"];
    const alternar = id => { const ya = !$(id).classList.contains("oculto"); paneles.forEach(x => $(x).classList.add("oculto")); if (!ya) $(id).classList.remove("oculto"); };

    // Etiqueta con línea (hoja Estructuras): línea vertical + subrayado, texto encima, todo escalado
    function etiqueta(d, s) {
        const n = (k, dflt) => { const x = num(s[k]); return x === undefined ? dflt : x; };
        const g = el("div"); g.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(" + (n("escala", (num(s.escalaPorcentaje) || 55) / 100)) + ")";
        const lc = s.lineaColor || "#fff", lt = n("lineaTop", -90), ll = n("lineaLeft", 0), gr = n("lineaGrosor", 2);
        const v1 = el("i"); v1.style.cssText = "position:absolute;background:" + lc + ";left:" + ll + "px;top:" + lt + "px;width:" + gr + "px;height:" + n("lineaAlto", 95) + "px";
        const h1 = el("i"); h1.style.cssText = "position:absolute;background:" + lc + ";left:" + ll + "px;top:" + lt + "px;height:" + gr + "px;width:" + n("lineaAncho", 95) + "px";
        const t = el("div"); t.style.cssText = "position:absolute;white-space:nowrap;left:" + n("textoLeft", 12) + "px;top:" + n("textoTop", -118) + "px;padding:" + n("padding", 0) + "px;border-radius:" + n("radio", 0) + "px;font-family:" + (s.textoFuente || "Raleway") + ",sans-serif";
        if (s.fondo && s.fondo !== "transparent") t.style.background = s.fondo;
        if (SI(s.sombra)) t.style.textShadow = "0 1px 4px #000";
        const a = el("div", "", s.titulo); a.style.cssText = "color:" + (s.tituloColor || "#fff") + ";font-size:" + n("tituloTamano", 17) + "px;font-weight:" + (s.tituloPeso || 700);
        t.appendChild(a);
        if (s.subtitulo && s.subtitulo.trim()) { const b = el("div", "", s.subtitulo.trim()); b.style.cssText = "color:" + (s.subtituloColor || "#fff") + ";font-size:" + n("subtituloTamano", 15) + "px;font-weight:" + (s.subtituloPeso || 400) + ";margin-top:" + n("subtituloMarginTop", 0) + "px"; t.appendChild(b); }
        g.append(v1, h1, t); d.appendChild(g);
    }
    // Punto circular (LinksExternos y Media): icono propio si existe, si no un emoji
    function pin(x, emoji, onClick) {
        return { pitch: num(x.pitch), yaw: num(x.yaw), type: "custom", cssClass: "pin", clickHandlerFunc: onClick,
            createTooltipFunc: d => {
                d.title = x.titulo || ""; d.setAttribute("role", "button"); d.setAttribute("aria-label", x.titulo || emoji);
                if (x.icono) { const i = el("img"); i.src = drive(x.icono); i.alt = ""; i.onerror = () => { i.remove(); d.textContent = emoji; }; d.appendChild(i); } else d.textContent = emoji;
            } };
    }
    // Ventana de foto o video (hoja Media)
    function abrirMedia(x) {
        const c = $("mediaCont"), url = String(x.link).trim(); c.replaceChildren();
        if (/video/i.test(x.tipo)) {
            const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/), dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
            if (yt || dr) { const f = el("iframe"); f.src = yt ? "https://www.youtube.com/embed/" + yt[1] : "https://drive.google.com/file/d/" + dr[1] + "/preview"; f.allow = "autoplay; fullscreen"; f.allowFullscreen = true; c.appendChild(f); }
            else { const vd = el("video"); vd.src = url; vd.controls = true; vd.autoplay = true; c.appendChild(vd); }
        } else { const im = el("img"); im.src = drive(url); im.alt = x.titulo || ""; c.appendChild(im); }
        $("mediaTit").textContent = x.titulo || ""; $("visorMedia").classList.remove("oculto");
    }
    function cerrarMedia() { $("visorMedia").classList.add("oculto"); $("mediaCont").replaceChildren(); }
    $("mediaCerrar").onclick = cerrarMedia;
    $("visorMedia").onclick = e => { if (e.target === $("visorMedia")) cerrarMedia(); };
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMedia(); });

    // Escenas + puntos interactivos
    const scenes = {};
    p.escenas.forEach(e => {
        const hs = [];
        p.lotes.filter(l => l.escena === e.idEscena && num(l.pitch) !== undefined && num(l.yaw) !== undefined).forEach(l => hs.push({
            pitch: num(l.pitch), yaw: num(l.yaw), type: "custom", cssClass: "lote",
            createTooltipFunc: d => { d.textContent = l.numero || ""; d.style.background = l.color || "#006400"; d.title = l.titulo || ""; },
            clickHandlerFunc: () => verLote(l)
        }));
        p.nav.filter(n => n.escenaOrigen === e.idEscena && scenesIds().includes(n.escenaDestino) && num(n.pitch) !== undefined).forEach(n => hs.push({
            pitch: num(n.pitch), yaw: num(n.yaw), type: "scene", sceneId: n.escenaDestino, text: n.texto || undefined
        }));
        p.estructuras.filter(s => s.escena === e.idEscena && s.titulo && num(s.pitch) !== undefined).forEach(s => hs.push({
            pitch: num(s.pitch), yaw: num(s.yaw), type: "custom", cssClass: "etq", createTooltipFunc: d => etiqueta(d, s)
        }));
        p.externos.filter(x => x.escena === e.idEscena && num(x.pitch) !== undefined).forEach(x => hs.push(pin(x, "🔗", () => {
            if (x.escenaDestino && scenes[x.escenaDestino]) v.loadScene(x.escenaDestino);
            else if (/^https?:\/\//i.test(x.link)) window.open(x.link, "_blank", "noopener");
        })));
        p.media.filter(x => x.escena === e.idEscena && num(x.pitch) !== undefined).forEach(x => hs.push(pin(x, /video/i.test(x.tipo) ? "▶" : "📷", () => abrirMedia(x))));
        (p.textos || []).filter(t => t.escena_id === e.idEscena && num(t.pitch) !== undefined).forEach(t => hs.push({
            pitch: num(t.pitch), yaw: num(t.yaw), type: "custom", cssClass: "etq",
            createTooltipFunc: d => {
                d.textContent = t.texto; d.style.color = t.color || "#fff"; d.style.fontSize = (num(t["tamaño"]) || 16) + "px"; d.style.fontFamily = t.fuente || "Arial";
                if (SI(t.negrita)) d.style.fontWeight = "700"; if (t.fondo && t.fondo !== "transparent") d.style.background = t.fondo;
            }
        }));
        scenes[e.idEscena] = def({ title: e.nombreMenu, type: "equirectangular", panorama: drive(e.imagen360, (window.CONFIG || {}).PANORAMA_ANCHO),
            pitch: num(e.pitchInicial), yaw: num(e.yawInicial), hfov: num(e.hfovInicial) || 100, hotSpots: hs });
    });
    function scenesIds() { return p.escenas.map(e => e.idEscena); }

    const primera = scenes[p.escenaInicial] ? p.escenaInicial : p.escenas[0].idEscena;
    const ui = p.ui || {};   // hoja UIConfig (opcional)
    const hfovMinFinal = x => { const s = (window.CONFIG || {}).HFOV_MIN_SEGURO || 0; return (x == null && !s) ? undefined : Math.max(x || 0, s); };
    const ajustes = def({
        minHfov: hfovMinFinal(num(ui.hfovMin)), maxHfov: num(ui.hfovMax),
        showZoomCtrl: ui.zoomVisible ? SI(ui.zoomVisible) : undefined,
        showFullscreenCtrl: ui.fullscreenVisible ? SI(ui.fullscreenVisible) : undefined
    });
    const v = pannellum.viewer("visor", { default: Object.assign({ firstScene: primera, autoLoad: true, compass: false, sceneFadeDuration: 700 }, ajustes), scenes });
    v.on("load", ocultarCarga);
    v.on("error", m => falla("No se pudo cargar la imagen 360: " + m));

    if (window.EXTRAS) EXTRAS.init({ p, v, el, wa, telGen, pin, verLote });   // polígonos, modelos 3D y tienda (js/extras.js)

    // Modo coordenadas: tour.html?id=tour1&coords=1 (o coordenadasActivo = SI en UIConfig).
    // Al tocar la imagen muestra pitch y yaw y los copia como "pitch<TAB>yaw" (se pegan en 2 celdas contiguas del Excel).
    if (new URLSearchParams(location.search).get("coords") === "1" || SI(ui.coordenadasActivo)) {
        const box = el("div", "coords", "Modo coordenadas: toca un punto de la imagen"); document.body.appendChild(box);
        let d0 = null; const vis = $("visor");
        vis.addEventListener("mousedown", e => { d0 = [e.clientX, e.clientY]; });
        vis.addEventListener("click", e => {
            if (d0 && Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 6) return;   // fue un arrastre, no un toque
            const c = v.mouseEventToCoords(e), p1 = c[0].toFixed(2), y1 = c[1].toFixed(2);
            box.textContent = "pitch: " + p1 + "   yaw: " + y1;
            try { navigator.clipboard.writeText(p1 + "\t" + y1).then(() => { box.textContent += "   (copiado)"; }, () => {}); } catch (x) {}
        });
    }

    // Brújula: si el Excel trae imagenBrujula (BrujulaConfig) se usa esa imagen; si no, la brújula dibujada por defecto.
    const b = p.brujula || {};
    if (b.imagenBrujula && /\/d\/|[?&]id=|^https?:/i.test(b.imagenBrujula)) {
        const old = $("brujulaUI"), im = document.createElement("img");
        im.id = "brujulaUI"; im.alt = "Brújula"; im.src = drive(b.imagenBrujula);
        im.onerror = () => { old.setAttribute("width", im.getAttribute("width") || 100); old.style.cssText = im.style.cssText; im.replaceWith(old); };   // si la imagen falla, vuelve a la brújula por defecto
        old.replaceWith(im);
    }
    const bu = $("brujulaUI");
    if (b.visible && !SI(b.visible) || (b.activo && !SI(b.activo))) bu.style.display = "none";
    bu.setAttribute("width", num(b["tamaño"]) || 100);
    ["top", "right", "bottom", "left"].forEach(k => { if (num(b[k]) !== undefined) bu.style[k] = b[k] + "px"; });
    if (num(b.bottom) !== undefined && num(b.top) === undefined) bu.style.top = "auto";
    if (num(b.left) !== undefined && num(b.right) === undefined) bu.style.right = "auto";
    if (num(b.opacidad) !== undefined) bu.style.opacity = num(b.opacidad) > 1 ? num(b.opacidad) / 100 : num(b.opacidad);
    const rot0 = num(b.rotacionInicial) || 0;
    (function girar() { $("brujulaUI").style.transform = "rotate(" + (rot0 - v.getYaw()) + "deg)"; requestAnimationFrame(girar); })();

    // Lote seleccionado
    function verLote(l) {
        const pi = $("panelInfo"), x = el("button", "cerrar", "×"); x.type = "button"; x.setAttribute("aria-label", "Cerrar");
        x.onclick = () => pi.classList.add("oculto");
        pi.replaceChildren(x, el("h3", "", l.titulo || "Lote " + l.numero));
        [["Estado", l.estado], ["Superficie", l.superficie], ["Dimensiones", l.dimensiones], ["Precio", l.precio], ["Detalle", l.descripcion]]
            .filter(f => f[1]).forEach(f => pi.appendChild(el("div", "fila", f[0] + ": " + f[1])));
        const a = el("a", "btn ok mini", "Consultar por WhatsApp");
        a.href = wa(l.whatsapp || telGen, (l.mensajeWhatsApp || "Hola, quiero información") + " - " + (l.titulo || "")); a.target = "_blank"; a.rel = "noopener noreferrer";
        pi.appendChild(a); paneles.forEach(q => $(q).classList.add("oculto")); pi.classList.remove("oculto");
    }

    // Menú de escenas
    if (p.escenas.length > 1) p.escenas.forEach(e => { const bt = el("button", "btn mini", e.nombreMenu || e.idEscena); bt.type = "button"; bt.onclick = () => v.loadScene(e.idEscena); $("menuEscenas").appendChild(bt); });

    // Mapa
    if (SI(p.mapaActivo) && num(p.mapaLat) !== undefined && num(p.mapaLng) !== undefined) {
        const f = el("iframe"); f.loading = "lazy"; f.title = "Ubicación"; f.style.cssText = "width:100%;height:260px;border:0;border-radius:12px";
        f.src = "https://www.google.com/maps?q=" + p.mapaLat + "," + p.mapaLng + "&output=embed";
        $("panelMapa").appendChild(f); $("btnAbrirMapa").classList.remove("oculto"); $("btnAbrirMapa").onclick = () => alternar("panelMapa");
    }

    // WhatsApp: agentes del proyecto + contacto general
    const mw = $("menuWA"); mw.appendChild(el("h3", "", "Habla con un asesor"));
    const ag = p.agentes.map(a => ({ n: a.nombre + (a.cargo ? " · " + a.cargo : ""), t: a.whatsapp, m: a.mensajeWhatsApp, f: a.foto }));
    if (!ag.length && telGen) ag.push({ n: "WhatsApp", t: telGen, m: p.mensajeWhatsApp });
    ag.forEach(a => { const l = el("a", "btn mini", a.n); if (a.f) { const i = el("img", "avatar"); i.src = drive(a.f); i.alt = ""; i.loading = "lazy"; i.onerror = () => i.remove(); l.prepend(i); }
        l.href = wa(a.t, a.m || p.mensajeWhatsApp); l.target = "_blank"; l.rel = "noopener noreferrer"; mw.appendChild(l); });
    $("btnWA").onclick = () => alternar("menuWA");
})();
