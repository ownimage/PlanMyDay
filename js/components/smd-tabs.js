const tabsStyles = `
  :host { display: block; width: 100%; box-sizing: border-box; }
  .smd-tab-list {
    display: flex;
    gap: 2px;
    padding: 0 4px;
    position: relative;
    z-index: 1;
  }
.smd-tab-btn {
    padding: 0.5rem 1.25rem;
    border: 1px solid var(--bs-border-color, #444);
    border-bottom: 1px solid var(--bs-primary, #0d6efd);
    border-radius: 6px 6px 0 0;
    background: var(--bs-tertiary-bg, #252525);
    color: var(--bs-secondary-color, #aaa);
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: background 0.15s, color 0.15s;
    margin-bottom: -1px;
  }
  .smd-tab-btn:hover:not([active]) {
    background: color-mix(in srgb, var(--bs-tertiary-bg, #252525) 80%, var(--bs-body-color, #eee));
    color: var(--bs-body-color, #eee);
  }
  .smd-tab-btn[active] {
    background: var(--bs-primary, #0d6efd);
    color: #fff;
    border-color: var(--bs-primary, #0d6efd);
    font-weight: 600;
    position: relative;
    z-index: 2;
  }
  .smd-tab-line {
    height: 1px;
    background: var(--bs-primary, #0d6efd);
    width: 100%;
    box-sizing: border-box;
  }
  :host > .smd-tab-line:last-of-type {
    margin-bottom: 1rem;
  }
  .smd-tab-panel {
    display: none;
    padding: 1rem;
  }
  .smd-tab-panel[active] {
    display: block;
  }
`;

class SmdTabs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this._tabs = [];
        this._activeIndex = 0;
    }

    get tabs() {
        return this._tabs;
    }

    set tabs(val) {
        this._tabs = val || [];
        this._activeIndex = 0;
        this._render();
    }

    static get observedAttributes() {
        return ['bottomline'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'bottomline' && oldValue !== newValue && this._tabs) {
            this._render();
        }
    }

    get activeIndex() {
        return this._activeIndex;
    }

    set activeIndex(val) {
        if (val >= 0 && val < this._tabs.length) {
            this._activeIndex = val;
            this._updateActive();
        }
    }

    get bottomline() {
        const attr = this.getAttribute('bottomline');
        return attr !== null && attr !== 'false';
    }

    set bottomline(val) {
        this.toggleAttribute('bottomline', !!val);
    }

    _render() {
        const headersHtml = this._tabs.map((tab, i) => {
            const active = i === this._activeIndex ? ' active' : '';
            const idAttr = tab.id ? ` id="${this._escapeAttr(tab.id)}"` : '';
            return `<button class="smd-tab-btn" data-index="${i}"${idAttr}${active}>${this._escapeHtml(tab.title)}</button>`;
        }).join('');

        const panelsHtml = this._tabs.map((tab, i) => {
            const active = i === this._activeIndex ? ' active' : '';
            const idAttr = tab.id ? ` id="${this._escapeAttr(tab.id)}-panel"` : '';
            return `<div class="smd-tab-panel"${idAttr}${active} data-panel="${i}">${tab.content || ''}</div>`;
        }).join('');

        const bottomLineHtml = this.bottomline ? '<div class="smd-tab-line"></div>' : '';

        this.shadowRoot.innerHTML = `
      <style>${tabsStyles}</style>
      <div class="smd-tab-list">${headersHtml}</div>
      <div class="smd-tab-line"></div>
      ${panelsHtml}
      ${bottomLineHtml}
    `;

        this.shadowRoot.querySelectorAll('.smd-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this._activeIndex = parseInt(btn.dataset.index);
                this._updateActive();
                this.dispatchEvent(new CustomEvent('smd-tabs-change', {
                    bubbles: true,
                    composed: true,
                    detail: {index: this._activeIndex, tab: this._tabs[this._activeIndex]},
                }));
            });
        });
    }

    _updateActive() {
        this.shadowRoot.querySelectorAll('.smd-tab-btn').forEach((btn, i) => {
            btn.toggleAttribute('active', i === this._activeIndex);
        });
        this.shadowRoot.querySelectorAll('.smd-tab-panel').forEach((panel, i) => {
            panel.toggleAttribute('active', i === this._activeIndex);
        });
    }

    _escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _escapeAttr(str) {
        if (!str) return '';
        return this._escapeHtml(str).replace(/'/g, '&#39;');
    }
}

customElements.define('smd-tabs', SmdTabs);

