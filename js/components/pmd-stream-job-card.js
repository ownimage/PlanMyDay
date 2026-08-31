const pmdStreamJobCardTemplate = document.createElement('template');
pmdStreamJobCardTemplate.innerHTML = `
  <style>
    :host {
      display: block;
      flex: 1 1 auto;
      min-width: 0;
      background-color: var(--bs-secondary-bg, #303030);
      border: 1px solid var(--bs-border-color, #495057);
      border-radius: 0;
      padding: 0.5rem;
    }
    [hidden] { display: none !important; }
    ::slotted(.drag-handle) {
      flex-shrink: 0;
      line-height: 1;
      font-size: 1.2rem;
      cursor: grab;
      touch-action: none;
      color: var(--bs-secondary-color, #6c757d);
      user-select: none;
      -webkit-user-select: none;
    }
    ::slotted(.drag-handle:active) { cursor: grabbing; }
    .row1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .thumb {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb img { display: block; max-width: 32px; max-height: 32px; }
    .title {
      font-weight: 700;
      min-width: 0;
      flex: 1;
      color: inherit;
    }
    .suffix { margin-left: 0.25rem; }
    .row2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-size: 0.875em;
    }
    .time {
      margin-left: 0.25rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.85rem;
      line-height: 1.5;
      text-align: center;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      align-self: center;
      margin-left: 0.75rem;
    }
    .btn-primary { background: var(--bs-primary, #0d6efd); color: #fff; }
    .badge {
      display: inline-block;
      padding: 0.35em 0.65em;
      font-size: 0.75em;
      font-weight: 700;
      line-height: 1;
      text-align: center;
      white-space: nowrap;
      border-radius: 0.375rem;
      flex-shrink: 0;
    }
    .bg-primary { background: var(--bs-primary, #0d6efd); color: #fff; }
    .bg-info { background: var(--bs-info, #0dcaf0); color: #000; }
    .bg-secondary { background: var(--bs-secondary, #6c757d); color: #fff; }
    label.active-toggle {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-bottom: 0;
      font-weight: 700;
      flex-shrink: 0;
      color: inherit;
      cursor: pointer;
    }
    input.active-toggle {
      width: 1.1em;
      height: 1.1em;
      margin: 0;
      flex-shrink: 0;
      appearance: none;
      -webkit-appearance: none;
      vertical-align: middle;
      background-color: var(--bs-secondary-bg, #495057);
      border: 1px solid var(--bs-border-color, #495057);
      border-radius: 0.25em;
      cursor: pointer;
      position: static;
    }
    input.active-toggle:checked {
      background-color: var(--bs-primary, #0d6efd);
      border-color: var(--bs-primary, #0d6efd);
    }
  </style>
  <div class="row1">
    <slot name="drag-handle"></slot>
    <div class="thumb" hidden><img alt=""></div>
    <div class="title">
      <span class="job-title"></span><span class="suffix badge bg-secondary" hidden></span>
    </div>
    <button type="button" class="btn btn-primary" data-action="edit">Edit</button>
  </div>
  <div class="row2">
    <label class="active-toggle">
      <input type="checkbox" class="active-toggle">
      <span>Active</span>
    </label>
    <span class="badge bg-primary schedule"></span>
    <span class="badge bg-secondary time" hidden></span>
    <span class="badge bg-info extra" hidden></span>
  </div>
`;

class PmdStreamJobCard extends HTMLElement {
  static get observedAttributes() {
    return ['stream-idx', 'job-idx', 'title', 'image', 'suffix', 'schedule', 'time', 'active', 'extra'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(pmdStreamJobCardTemplate.content.cloneNode(true));
  }

  connectedCallback() {
    const root = this.shadowRoot;
    root.querySelector('[data-action="edit"]').addEventListener('click', () => this._emit('pmd-job-edit'));
    root.querySelector('input.active-toggle').addEventListener('change', (e) => {
      this.dispatchEvent(new CustomEvent('pmd-job-toggle-active', {
        bubbles: true,
        composed: true,
        detail: {
          streamIdx: parseInt(this.getAttribute('stream-idx'), 10),
          jobIdx: parseInt(this.getAttribute('job-idx'), 10),
          checked: e.target.checked
        }
      }));
    });
    this._render();
  }

  attributeChangedCallback(name) {
    if (this.isConnected) this._render();
  }

  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: {
        streamIdx: parseInt(this.getAttribute('stream-idx'), 10),
        jobIdx: parseInt(this.getAttribute('job-idx'), 10)
      }
    }));
  }

  _render() {
    const root = this.shadowRoot;
    const title = this.getAttribute('title') || '';
    const image = this.getAttribute('image') || '';
    const suffix = this.getAttribute('suffix') || '';
    const schedule = this.getAttribute('schedule') || '';
    const time = this.getAttribute('time') || '';
    const extra = this.getAttribute('extra') || '';
    const active = this.getAttribute('active') !== 'false';

    root.querySelector('.job-title').textContent = title;

    const thumb = root.querySelector('.thumb');
    const img = root.querySelector('.thumb img');
    if (image) {
      img.src = image;
      thumb.hidden = false;
    } else {
      img.removeAttribute('src');
      thumb.hidden = true;
    }

    const suffixEl = root.querySelector('.suffix');
    if (suffix.trim()) {
      suffixEl.textContent = suffix.trim();
      suffixEl.hidden = false;
    } else {
      suffixEl.hidden = true;
    }

    root.querySelector('.schedule').textContent = schedule;

    const timeEl = root.querySelector('.time');
    if (time) {
      timeEl.textContent = time;
      timeEl.hidden = false;
    } else {
      timeEl.hidden = true;
    }

    const extraEl = root.querySelector('.extra');
    if (extra) {
      extraEl.textContent = extra;
      extraEl.hidden = false;
    } else {
      extraEl.hidden = true;
    }

    root.querySelector('input.active-toggle').checked = active;
  }
}

customElements.define('pmd-stream-job-card', PmdStreamJobCard);
