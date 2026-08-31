const pmdImageCardTemplate = document.createElement('template');
pmdImageCardTemplate.innerHTML = `
  <style>
    :host {
      display: block;
      background-color: var(--bs-card-bg, var(--bs-secondary-bg, #303030));
      border: 1px solid var(--bs-border-color, #495057);
      border-radius: 0.375rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    [hidden] { display: none !important; }
    .row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .thumb {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb img { display: block; max-width: 40px; max-height: 40px; }
    .name {
      font-weight: 700;
      min-width: 0;
      flex: 1;
      color: inherit;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    smd-button {
      flex-shrink: 0;
    }
    smd-button::part(button) {
      width: 36px;
      height: 36px;
      padding: 0.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    smd-button[disabled]::part(button) {
      cursor: not-allowed;
    }
  </style>
  <div class="row">
    <div class="thumb" hidden><img alt=""></div>
    <span class="name"></span>
    <div class="actions">
      <smd-button data-action="delete" variant="danger" title="Delete" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
      </smd-button>
      <smd-button data-action="duplicate" variant="info" title="Duplicate">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="9" height="9" rx="1"/><rect x="6" y="6" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      </smd-button>
      <smd-button data-action="edit" variant="primary" title="Edit">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106a.5.5 0 0 1-.707-.708l-1.28 1.28-1.414-1.414 1.28-1.28a.5.5 0 0 1-.708-.708z"/></svg>
      </smd-button>
    </div>
  </div>
`;

class PmdImageCard extends HTMLElement {
  static get observedAttributes() {
    return ['image-idx', 'name', 'image', 'in-use'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(pmdImageCardTemplate.content.cloneNode(true));
  }

  connectedCallback() {
    const root = this.shadowRoot;
    root.querySelector('[data-action="delete"]').addEventListener('click', () => this._emit('pmd-image-delete'));
    root.querySelector('[data-action="duplicate"]').addEventListener('click', () => this._emit('pmd-image-duplicate'));
    root.querySelector('[data-action="edit"]').addEventListener('click', () => this._emit('pmd-image-edit'));
    this._render();
  }

  attributeChangedCallback(name) {
    if (this.isConnected) this._render();
  }

  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: { imageIdx: parseInt(this.getAttribute('image-idx'), 10) }
    }));
  }

  _render() {
    const root = this.shadowRoot;
    const name = this.getAttribute('name') || '';
    const image = this.getAttribute('image') || '';
    const inUse = this.hasAttribute('in-use');

    root.querySelector('.name').textContent = name;

    const thumb = root.querySelector('.thumb');
    const img = root.querySelector('.thumb img');
    if (image) {
      img.src = image;
      thumb.hidden = false;
    } else {
      img.removeAttribute('src');
      thumb.hidden = true;
    }

    const delBtn = root.querySelector('[data-action="delete"]');
    if (inUse) delBtn.setAttribute('disabled', '');
    else delBtn.removeAttribute('disabled');
  }
}

customElements.define('pmd-image-card', PmdImageCard);
