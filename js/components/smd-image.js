// <smd-image> — displays an image looked up from a localStorage images list.
//
// Shared/reusable: the storage key prefix is supplied via the key-prefix
// attribute (e.g. "planmydays_"), the image to show via `image` (its name),
// and the theme via `theme` (auto | light | dark; default auto resolves from
// the document's data-bs-theme). The list key is keyPrefix + "images".
//
// Each stored image is { name, data, themes: { light: {line,fill,width}, dark: {...} } }.
// data is a data: URL; SVG data URLs are recoloured from the matching theme
// override (stroke/fill/stroke-width) on render.
(function (global) {
  "use strict";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applySvgAttr(dataUrl, attr, value) {
    const svgPart = dataUrl.substring("data:image/svg+xml,".length);
    const decoded = decodeURIComponent(svgPart);
    const encoded = value && value.startsWith("#") ? value : value || "none";
    const rx = new RegExp(`\\b${attr}\\s*=\\s*["'][^"']*["']`);
    if (rx.test(decoded)) {
      return "data:image/svg+xml," + encodeURIComponent(decoded.replace(new RegExp(rx.source, "g"), function (m) {
        const quote = m.indexOf('"') !== -1 ? '"' : "'";
        return attr + "=" + quote + encoded + quote;
      }));
    }
    const updated = decoded.replace(/<svg([\s>])/i, `<svg ${attr}="${encoded}"$1`);
    return "data:image/svg+xml," + encodeURIComponent(updated);
  }

  function themedSrc(data, theme, overrides) {
    if (!data || data.indexOf("data:image/svg+xml,") !== 0 || !overrides) return data;
    let out = data;
    if (overrides.line != null && overrides.line !== "") out = applySvgAttr(out, "stroke", overrides.line);
    if (overrides.fill != null && overrides.fill !== "") out = applySvgAttr(out, "fill", overrides.fill);
    if (overrides.width != null && overrides.width !== "") out = applySvgAttr(out, "stroke-width", overrides.width);
    return out;
  }

  let biCssPromise = null;
  let biGlyphs = null;

  function parseBiGlyphs(cssText) {
    const map = {};
    const re = /\.bi-([a-z0-9][a-z0-9-]*)::before[^}]*content:\s*["']\\([0-9a-fA-F]+)["']/g;
    let m;
    while ((m = re.exec(cssText))) map[m[1]] = m[2];
    return map;
  }

  function ensureBiGlyphs() {
    if (biGlyphs) return Promise.resolve(biGlyphs);
    if (!biCssPromise) {
      const v = typeof global.BUILD_NUMBER !== "undefined" ? global.BUILD_NUMBER : Date.now();
      biCssPromise = global.fetch("/vendor/bootstrap-icons.css?v=" + v)
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (txt) {
          biGlyphs = parseBiGlyphs(txt);
          return biGlyphs;
        })
        .catch(function (err) {
          biCssPromise = null;
          throw err;
        });
    }
    return biCssPromise;
  }

  function biGlyph(name) {
    if (!biGlyphs) return null;
    const hex = biGlyphs[name];
    return hex ? String.fromCodePoint(parseInt(hex, 16)) : null;
  }

  class SmdImage extends HTMLElement {
    static get observedAttributes() {
      return ["image", "key-prefix", "theme", "alt", "size"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      SmdStyles.adoptStyles(this.shadowRoot, [
        SmdStyles.hiddenSheet,
        SmdStyles.sheetFor(`
          :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          img {
            display: block;
            max-width: 100%;
            max-height: 100%;
          }
          .smd-bi {
            font-family: "bootstrap-icons";
            font-style: normal;
            font-weight: normal;
            font-variant: normal;
            text-transform: none;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `)
      ]);
      this.shadowRoot.innerHTML = '<img alt="">';
    }

    get keyPrefix() {
      return this.getAttribute("key-prefix") || "";
    }

    get theme() {
      const t = (this.getAttribute("theme") || "auto").toLowerCase();
      return t === "auto" ? this._autoTheme() : t;
    }

    connectedCallback() {
      this._themeObserver = new MutationObserver(() => this._render());
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-bs-theme", "data-theme"]
      });
      this._render();
    }

    disconnectedCallback() {
      if (this._themeObserver) {
        this._themeObserver.disconnect();
        this._themeObserver = null;
      }
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    _autoTheme() {
      return (document.documentElement.getAttribute("data-bs-theme") || "dark") === "dark" ? "dark" : "light";
    }

    // Requested render size in px (attr `size`), or 0 when not set.
    _sizePx() {
      const v = parseInt(this.getAttribute("size"), 10);
      return isNaN(v) || v <= 0 ? 0 : v;
    }

    _findImage() {
      const key = this.keyPrefix + "images";
      let images = [];
      try {
        images = JSON.parse(global.localStorage.getItem(key) || "[]");
      } catch (e) {
        images = [];
      }
      if (!Array.isArray(images)) return null;
      const name = this.getAttribute("image");
      if (!name) return null;
      return images.find(function (img) { return img && img.name === name; }) || null;
    }

    // Re-reads storage and re-renders (call after the underlying store changes).
    refresh() {
      this._render();
    }

    _render() {
      const name = this.getAttribute("image") || "";
      const px = this._sizePx();

      // Sized renders get a shared, cached `:host` stylesheet (one sheet per px).
      if (px > 0) {
        SmdStyles.adoptStyles(this.shadowRoot, SmdStyles.sheetFor(":host { width: " + px + "px; height: " + px + "px; }"));
      }

      if (name.indexOf("bi:") === 0) {
        this._renderBi(name.slice(3), px);
        return;
      }
      this._renderStored(name, px);
    }

    _renderStored(name, px) {
      const img = this.shadowRoot.querySelector("img");
      const span = this.shadowRoot.querySelector(".smd-bi");
      if (!img) return;
      if (span) span.hidden = true;
      const stored = this._findImage();
      const alt = this.getAttribute("alt") || "";

      // Non-SVG images may only carry downscaled thumbnails (data64/80/100) when
      // the full-size `data` has been stripped for size; prefer the thumbnail for
      // the requested size, then any larger one.
      const src = stored ? (stored.data || stored["data" + px] || stored.data100 || stored.data80 || stored.data64) : null;
      if (!stored || !src) {
        img.removeAttribute("src");
        img.hidden = true;
        return;
      }
      const theme = this.theme;
      const overrides = (stored.themes && stored.themes[theme]) || {};
      img.src = themedSrc(src, theme, overrides);
      img.alt = alt || escapeHtml(this.getAttribute("image") || "");
      img.hidden = false;
    }

    _renderBi(iconName, px) {
      const img = this.shadowRoot.querySelector("img");
      if (img) {
        img.removeAttribute("src");
        img.hidden = true;
      }
      let span = this.shadowRoot.querySelector(".smd-bi");
      const glyph = biGlyph(iconName);
      if (!glyph) {
        if (span) span.hidden = true;
        if (!biGlyphs) {
          ensureBiGlyphs().then(() => {
            if (this.isConnected && (this.getAttribute("image") || "") === "bi:" + iconName) this._render();
          }).catch(() => {});
        }
        return;
      }
      if (!span) {
        span = document.createElement("span");
        span.className = "smd-bi";
        this.shadowRoot.appendChild(span);
      }
      span.textContent = glyph;
      span.style.fontSize = px > 0 ? Math.max(8, Math.round(px * 0.8)) + "px" : "1.5rem";
      span.hidden = false;
    }
  }

  if (!global.customElements.get("smd-image")) {
    global.customElements.define("smd-image", SmdImage);
  }
})(window);