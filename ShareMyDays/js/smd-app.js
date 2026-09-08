// SmdApp — the shared application base class. Apps built on the ShareMyDays
// library extend this class (e.g. PlanMyDayApp in the consumer's app.js).
//
// The shared SERVICE FILES (smd-settings.js, smd-images.js, smd-minio.js) attach
// their methods onto SmdApp.prototype, so an app instance inherits them all.
// Every service reads its storage keys through smdKey(name) below, so the
// per-app storage prefix in SmdConfig is honoured everywhere.

"use strict";

// ---- App-level config (mutated by the app's constructor) -------
var SmdConfig = {
  storagePrefix: "planmydays_", // default keeps existing apps' data intact
  themeDefault: "darkly",
  appName: "Application"
};

// Namespace-string helper: `<prefix><name>`. All shared services read/write
// localStorage through this instead of hardcoding a vendor prefix.
function smdKey(name) {
  return SmdConfig.storagePrefix + (name || "");
}

// ---- Generic helpers exposed on SmdApp.prototype (and as globals) ----

function $id(id, root) {
  root = root || document;
  if (typeof root.getElementById === "function") {
    const el = root.getElementById(id);
    if (el) return el;
  }
  const base = root === document ? (root.body || root) : root;
  if (!base) return null;
  const walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.shadowRoot) {
      const found = $id(id, node.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// MODAL HELPERS
// Bootstrap ignores hide() while a modal's show transition is running, so track
// the fully-shown state and defer hide() until the "shown" event fires.
document.addEventListener("shown.bs.modal", function(e) { e.target.dataset.bsShown = "true"; });
document.addEventListener("hidden.bs.modal", function(e) { e.target.dataset.bsShown = "false"; });
function safeHideModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  const hide = () => bootstrap.Modal.getOrCreateInstance(el).hide();
  if (el.dataset.bsShown === "true") hide();
  else el.addEventListener("shown.bs.modal", hide, { once: true });
}

// Single shared <smd-modal> host, driven by set option objects; resolves via
// the smd-modal-action event. Every app/modal flow uses showSmdModal.
let _smdModalHost = null;
function showSmdModal(options) {
  if (!_smdModalHost) {
    _smdModalHost = document.createElement("smd-modal");
    _smdModalHost.id = "smdConfirmModal";
    document.body.appendChild(_smdModalHost);
  }
  const modal = _smdModalHost;
  modal.title = options.title || "";
  modal.content = options.content || "";
  modal.buttons = options.buttons || [{ text: "OK", variant: "primary", action: "ok" }];
  const onAction = options.onAction;
  const handler = function(e) {
    modal.removeEventListener("smd-modal-action", handler);
    if (onAction) onAction(e.detail);
  };
  modal.addEventListener("smd-modal-action", handler);
  modal.show();
}

function showInfoConfirm(message) {
  showSmdModal({
    title: "Sample images loaded",
    content: escapeHtml(message).replace(/\n/g, "<br>"),
    buttons: [
      { text: "OK", variant: "primary", action: "ok" }
    ]
  });
}

function updateNavState() {
  const nav = document.getElementById("mainNav");
  if (nav) nav.classList.toggle("nav-inactive", false);
}

function injectStyleInto(root, css) {
  if (!root) return;
  css = css || SETTINGS_STYLES;
  SmdStyles.adoptStyles(root, css);
}

// ---- The base class ----
class SmdApp {
  constructor(config) {
    config = config || {};
    if (typeof config.storagePrefix !== "undefined") SmdConfig.storagePrefix = config.storagePrefix;
    if (typeof config.themeDefault !== "undefined") SmdConfig.themeDefault = config.themeDefault;
    if (typeof config.appName !== "undefined") SmdConfig.appName = config.appName;
    this.config = Object.assign({}, SmdConfig, config);
    this.menuItems = config.menuItems || [];
    this.settingsSections = config.settingsSections || [];
    this.settingsFooterHtml = config.settingsFooterHtml || "";
    SmdApp.current = this;
    window.PMD = this;
  }

  // Storage key helper (prefix-aware): this.key("theme") -> "planmydays_theme".
  key(name) { return smdKey(name); }

  // Build the main menu from this.menuItems. Each item:
  //   { label, action, divider?: true, minio?: true, button?: true }
  // The library renders shared items (Settings/Images/Export/Import/Minio) when
  // present; the app supplies its domain items via config.menuItems.
  renderMenu(root) {
    root = root || document.getElementById("mainNav");
    if (!root) return null;
    const ul = root.querySelector(".dropdown-menu");
    if (!ul) return root;
    ul.innerHTML = this.menuItems.map(function (item) {
      if (item.divider) {
        return '<li><hr class="dropdown-divider' + (item.minio ? ' minio-menu-item' : '') + '"' + (item.minio ? ' style="display:none"' : '') + '></li>';
      }
      const cls = "dropdown-item" + (item.minio ? " minio-menu-item" : "");
      const style = item.minio ? ' style="display:none"' : '';
      if (item.button) {
        return '<li><button type="button" class="' + cls + '"' + style + ' onclick="' + item.action + '">' + item.label + '</button></li>';
      }
      return '<li><a class="' + cls + '"' + style + ' onclick="' + item.action + '">' + item.label + '</a></li>';
    }).join("");
    return root;
  }

  // Build the settings page content from this.settingsSections (+ footer).
  buildSettingsContent() {
    const settingsPage = document.getElementById("settingsPage");
    if (!settingsPage) return;
    const sections = this.settingsSections;
    const footerHtml = this.settingsFooterHtml;

    settingsPage.title = "Settings";
    settingsPage.content = '<smd-tabs id="settingsTabs"></smd-tabs>' + footerHtml;
    settingsPage.buttons = [{ text: "Done", variant: "success", action: "done" }];

    const tabsEl = $id("settingsTabs");
    if (tabsEl) {
      tabsEl.tabs = sections;
      tabsEl.bottomline = true;
    }
    if (typeof injectSettingsStyles === "function") injectSettingsStyles();
  }
}