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
      return "data:image/svg+xml," + encodeURIComponent(decoded.replace(rx, function (m) {
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

  class SmdImage extends HTMLElement {
    static get observedAttributes() {
      return ["image", "key-prefix", "theme", "alt"];
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
      const img = this.shadowRoot.querySelector("img");
      if (!img) return;
      const stored = this._findImage();
      const alt = this.getAttribute("alt") || "";
      // Non-SVG images may only carry downscaled thumbnails (data64/80/100) when
      // the full-size `data` has been stripped for size; fall back to the largest.
      const src = stored ? (stored.data || stored.data100 || stored.data80 || stored.data64) : null;
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
  }

  if (!global.customElements.get("smd-image")) {
    global.customElements.define("smd-image", SmdImage);
  }
})(window);