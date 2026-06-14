import { test } from 'node:test';
import assert from 'node:assert/strict';

const DEFAULT_DONATE_TEXT = '♥ Spende via PayPal';
let importCounter = 0;

class FakeClassList {
  constructor(element, initial = '') {
    this.element = element;
    this.classes = new Set(initial.split(/\s+/).filter(Boolean));
  }

  add(...names) {
    for (const name of names) this.classes.add(name);
    this.sync();
  }

  remove(...names) {
    for (const name of names) this.classes.delete(name);
    this.sync();
  }

  contains(name) {
    return this.classes.has(name);
  }

  sync() {
    this.element._className = [...this.classes].join(' ');
  }
}

class FakeElement {
  constructor(document, tagName, id = '') {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.disabled = false;
    this.eventListeners = new Map();
    this.href = '';
    this.rel = '';
    this.target = '';
    this.textContent = '';
    this.title = '';
    this.style = {
      cssText: '',
      setProperty(name, value) {
        this[name] = value;
      },
    };
    this._className = '';
    this.classList = new FakeClassList(this);
  }

  set className(value) {
    this._className = value;
    this.classList = new FakeClassList(this, value);
  }

  get className() {
    return this._className;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  appendChild(node) {
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  addEventListener(type, handler) {
    const handlers = this.eventListeners.get(type) || [];
    handlers.push(handler);
    this.eventListeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    event.target ??= this;
    for (const handler of this.eventListeners.get(type) || []) handler(event);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  querySelectorAll(selector) {
    if (!selector.includes('a[href]') || !selector.includes('button:not([disabled])')) {
      return [];
    }

    const result = [];
    const visit = (node) => {
      for (const child of node.children) {
        const isLink = child.tagName === 'A' && child.href;
        const isButton = child.tagName === 'BUTTON' && !child.disabled;
        if (isLink || isButton) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
    this.activeElement = null;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  register(id, tagName = 'div') {
    const element = new FakeElement(this, tagName, id);
    this.elements.set(id, element);
    return element;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  addEventListener(type, handler) {
    const handlers = this.eventListeners.get(type) || [];
    handlers.push(handler);
    this.eventListeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.eventListeners.get(type) || []) handler(event);
  }
}

function keyEvent(key, shiftKey = false) {
  return {
    key,
    shiftKey,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

function click(element) {
  const event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: element,
  };
  element.dispatch('click', event);
  return event;
}

function buildAboutDom() {
  const document = new FakeDocument();
  globalThis.document = document;

  const aboutButton = document.register('btn-about', 'button');
  const closeButton = document.register('btn-about-close', 'button');
  const overlay = document.register('about-overlay');
  const title = document.register('about-title', 'h2');
  const privacyList = document.register('about-privacy-list', 'ul');
  const donate = document.register('about-donate-link', 'a');
  const appsList = document.register('about-apps-list');

  aboutButton.textContent = '♥ Unterstützen';
  closeButton.textContent = '×';
  donate.textContent = DEFAULT_DONATE_TEXT;
  overlay.classList.add('overlay', 'hidden');
  overlay.append(closeButton, title, privacyList, donate, appsList);

  return { document, aboutButton, closeButton, overlay, donate };
}

async function loadAboutModule() {
  importCounter += 1;
  return import(`../js/about.js?test=${Date.now()}-${importCounter}`);
}

test('About-Overlay hält Tab-Fokus im Dialog und Escape gibt Fokus zurück', async () => {
  const { document, aboutButton, closeButton, overlay } = buildAboutDom();
  const { setupAbout } = await loadAboutModule();
  setupAbout();

  aboutButton.focus();
  click(aboutButton);

  assert.equal(overlay.classList.contains('hidden'), false);
  assert.equal(document.activeElement, closeButton);

  const focusable = overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  assert.ok(focusable.length > 2);
  const lastFocusable = focusable[focusable.length - 1];

  const shiftTab = keyEvent('Tab', true);
  document.dispatch('keydown', shiftTab);

  assert.equal(shiftTab.defaultPrevented, true);
  assert.equal(document.activeElement, lastFocusable);

  const tab = keyEvent('Tab');
  document.dispatch('keydown', tab);

  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement, closeButton);

  document.dispatch('keydown', keyEvent('Escape'));

  assert.equal(overlay.classList.contains('hidden'), true);
  assert.equal(document.activeElement, aboutButton);
});

test('About-Overlay setzt den Platzhalter-Spendenhinweis beim Schließen zurück', async () => {
  const { aboutButton, closeButton, donate } = buildAboutDom();
  const { setupAbout } = await loadAboutModule();
  setupAbout();

  aboutButton.focus();
  click(aboutButton);
  click(donate);

  assert.equal(donate.textContent, '♥ Spendenlink folgt in Kürze');

  click(closeButton);

  assert.equal(donate.textContent, DEFAULT_DONATE_TEXT);

  click(aboutButton);

  assert.equal(donate.textContent, DEFAULT_DONATE_TEXT);
});
