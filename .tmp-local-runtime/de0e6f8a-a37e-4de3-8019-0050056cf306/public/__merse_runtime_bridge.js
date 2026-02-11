(function () {
  if (window.__MERSE_RUNTIME_BRIDGE_READY__) return;
  window.__MERSE_RUNTIME_BRIDGE_READY__ = true;

  var BRIDGE_SOURCE = 'MERSE_RUNTIME_BRIDGE';
  var PARENT_SOURCE = 'MERSE_PARENT';
  var STYLE_ID = '__merse_runtime_bridge_style__';
  var SELECTED_CLASS = '__merse_runtime_selected__';
  var FLOAT_BUTTON_ID = '__merse_runtime_fab__';
  var FLOAT_BUTTON_LABEL_ID = '__merse_runtime_fab_label__';
  var enabled = false;
  var selectedElement = null;
  var selectedMeta = null;

  function post(type, payload) {
    if (!window.parent) return;
    window.parent.postMessage({ source: BRIDGE_SOURCE, type: type, payload: payload || {} }, '*');
  }

  function ensureStyleTag() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.' + SELECTED_CLASS + ' {',
      '  outline: 2px solid rgba(167, 139, 250, 0.95) !important;',
      '  box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.95), 0 0 22px rgba(124, 58, 237, 0.5) !important;',
      '  transition: outline-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;',
      '}',
      '#' + FLOAT_BUTTON_ID + ' {',
      '  position: fixed;',
      '  right: 18px;',
      '  bottom: 18px;',
      '  width: 58px;',
      '  height: 58px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(196, 181, 253, 0.38);',
      '  background: linear-gradient(145deg, rgba(126, 34, 206, 0.42), rgba(76, 29, 149, 0.28));',
      '  box-shadow: 0 14px 32px rgba(31, 9, 66, 0.5), inset 0 1px 0 rgba(255,255,255,0.24);',
      '  backdrop-filter: blur(14px) saturate(130%);',
      '  -webkit-backdrop-filter: blur(14px) saturate(130%);',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  color: #f5f3ff;',
      '  cursor: pointer;',
      '  z-index: 2147483647;',
      '  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;',
      '}',
      '#' + FLOAT_BUTTON_ID + ':hover {',
      '  transform: translateY(-2px) scale(1.02);',
      '  box-shadow: 0 20px 36px rgba(56, 18, 117, 0.55), inset 0 1px 0 rgba(255,255,255,0.3);',
      '}',
      '#' + FLOAT_BUTTON_ID + ':active {',
      '  transform: translateY(0) scale(0.98);',
      '}',
      '#' + FLOAT_BUTTON_ID + ' svg {',
      '  width: 25px;',
      '  height: 25px;',
      '  pointer-events: none;',
      '}',
      '#' + FLOAT_BUTTON_LABEL_ID + ' {',
      '  position: absolute;',
      '  top: -6px;',
      '  right: -4px;',
      '  min-width: 24px;',
      '  height: 16px;',
      '  border-radius: 999px;',
      '  background: rgba(30, 27, 75, 0.85);',
      '  border: 1px solid rgba(196, 181, 253, 0.5);',
      '  color: rgba(233, 213, 255, 0.95);',
      '  font: 600 9px/14px ui-sans-serif, system-ui, sans-serif;',
      '  text-align: center;',
      '  padding: 0 4px;',
      '  letter-spacing: 0.05em;',
      '}',
      '#' + FLOAT_BUTTON_ID + '.__merse_runtime_fab_on {',
      '  border-color: rgba(216, 180, 254, 0.78);',
      '  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.75), 0 18px 40px rgba(91, 33, 182, 0.62), inset 0 1px 0 rgba(255,255,255,0.34);',
      '}',
      '#' + FLOAT_BUTTON_ID + '.__merse_runtime_fab_on #' + FLOAT_BUTTON_LABEL_ID + ' {',
      '  background: rgba(167, 139, 250, 0.32);',
      '  border-color: rgba(233, 213, 255, 0.75);',
      '  color: rgba(250, 245, 255, 0.98);',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function getFiber(node) {
    if (!node) return null;
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key.indexOf('__reactFiber$') === 0 || key.indexOf('__reactInternalInstance$') === 0) {
        return node[key];
      }
    }
    return null;
  }

  function resolveComponentName(node) {
    var current = node;
    while (current && current !== document.body) {
      var fiber = getFiber(current);
      while (fiber) {
        var maybeType = fiber.elementType || fiber.type;
        if (maybeType && typeof maybeType !== 'string') {
          var name = maybeType.displayName || maybeType.name;
          if (name && name !== 'Anonymous') return name;
        }
        fiber = fiber.return;
      }
      current = current.parentElement;
    }
    return null;
  }

  function buildSelectorHint(element) {
    if (!element) return '';
    if (element.id) return '#' + element.id;
    var className = typeof element.className === 'string' ? element.className.trim() : '';
    if (className) {
      var classToken = className.split(/\s+/).filter(Boolean)[0] || '';
      if (classToken) return element.tagName.toLowerCase() + '.' + classToken;
    }
    return element.tagName ? element.tagName.toLowerCase() : 'element';
  }

  function describeElement(element) {
    var rect = element.getBoundingClientRect();
    var text = (element.innerText || element.textContent || '').trim().slice(0, 140);
    var className = typeof element.className === 'string' ? element.className.trim() : '';
    var meta = {
      componentName: resolveComponentName(element),
      tagName: element.tagName || '',
      id: element.id || null,
      className: className || null,
      selectorHint: buildSelectorHint(element),
      textPreview: text,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      offsetX: Number(element.dataset.merseOffsetX || 0),
      offsetY: Number(element.dataset.merseOffsetY || 0),
    };
    return meta;
  }

  function clearSelected() {
    if (selectedElement) {
      selectedElement.classList.remove(SELECTED_CLASS);
    }
    selectedElement = null;
    selectedMeta = null;
  }

  function setSelected(element) {
    if (!element || !(element instanceof HTMLElement)) return;
    if (selectedElement && selectedElement !== element) {
      selectedElement.classList.remove(SELECTED_CLASS);
    }
    selectedElement = element;
    selectedElement.classList.add(SELECTED_CLASS);
    selectedMeta = describeElement(selectedElement);
    post('ELEMENT_SELECTED', selectedMeta);
  }

  function updateFloatingButtonState() {
    var button = document.getElementById(FLOAT_BUTTON_ID);
    if (!(button instanceof HTMLElement)) return;
    var badge = document.getElementById(FLOAT_BUTTON_LABEL_ID);
    if (enabled) {
      button.classList.add('__merse_runtime_fab_on');
      if (badge) badge.textContent = 'ON';
      return;
    }
    button.classList.remove('__merse_runtime_fab_on');
    if (badge) badge.textContent = 'OFF';
  }

  function ensureFloatingButton() {
    if (!(document.body instanceof HTMLElement)) return;
    if (document.getElementById(FLOAT_BUTTON_ID)) {
      updateFloatingButtonState();
      return;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.id = FLOAT_BUTTON_ID;
    button.setAttribute('aria-label', 'Ferramentas');
    button.setAttribute('title', 'Ferramentas');
    button.innerHTML = [
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
      '<path d="M14.7 6.3a3.9 3.9 0 0 0 3.9 3.9c.5 0 .9-.1 1.3-.2a5.6 5.6 0 0 1-7.6 7.6c.1-.4.2-.8.2-1.3a3.9 3.9 0 0 0-3.9-3.9c-.5 0-.9.1-1.3.2a5.6 5.6 0 0 1 7.6-7.6c-.1.4-.2.8-.2 1.3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="m5.2 18.8 3.1-3.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      '</svg>',
      '<span id="' + FLOAT_BUTTON_LABEL_ID + '">OFF</span>',
    ].join('');

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      setSelectMode(!enabled);
      if (!enabled) {
        clearSelected();
        post('SELECTION_CLEARED', {});
      }
    });

    document.body.appendChild(button);
    updateFloatingButtonState();
  }

  function setSelectMode(nextEnabled) {
    enabled = Boolean(nextEnabled);
    document.documentElement.style.cursor = enabled ? 'crosshair' : '';
    updateFloatingButtonState();
    post('MODE_CHANGED', { enabled: enabled });
  }

  function moveSelected(dx, dy) {
    if (!selectedElement) return;
    var deltaX = Number(dx || 0);
    var deltaY = Number(dy || 0);
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

    if (typeof selectedElement.dataset.merseBaseTransform !== 'string') {
      selectedElement.dataset.merseBaseTransform = selectedElement.style.transform || '';
    }

    var currentX = Number(selectedElement.dataset.merseOffsetX || 0);
    var currentY = Number(selectedElement.dataset.merseOffsetY || 0);
    var nextX = currentX + deltaX;
    var nextY = currentY + deltaY;

    selectedElement.dataset.merseOffsetX = String(nextX);
    selectedElement.dataset.merseOffsetY = String(nextY);

    var baseTransform = selectedElement.dataset.merseBaseTransform || '';
    var translateTransform = 'translate(' + nextX + 'px, ' + nextY + 'px)';
    selectedElement.style.transform = (baseTransform ? baseTransform + ' ' : '') + translateTransform;
    selectedElement.style.willChange = 'transform';

    selectedMeta = describeElement(selectedElement);
    post('ELEMENT_MOVED', selectedMeta);
  }

  function onClickCapture(event) {
    if (!enabled) return;
    var target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === FLOAT_BUTTON_ID || (typeof target.closest === 'function' && target.closest('#' + FLOAT_BUTTON_ID))) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    setSelected(target);
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== PARENT_SOURCE) return;

    if (data.type === 'MERSE_BRIDGE_SET_MODE') {
      var payload = data.payload || {};
      setSelectMode(Boolean(payload.enabled));
      return;
    }

    if (data.type === 'MERSE_BRIDGE_CLEAR_SELECTION') {
      clearSelected();
      post('SELECTION_CLEARED', {});
      return;
    }

    if (data.type === 'MERSE_BRIDGE_MOVE_SELECTED') {
      var movePayload = data.payload || {};
      moveSelected(movePayload.dx, movePayload.dy);
      return;
    }

    if (data.type === 'MERSE_BRIDGE_PING') {
      post('BRIDGE_READY', { href: window.location.href });
    }
  });

  document.addEventListener('click', onClickCapture, true);
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    setSelectMode(false);
    clearSelected();
    post('SELECTION_CLEARED', {});
  });

  ensureStyleTag();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFloatingButton, { once: true });
  } else {
    ensureFloatingButton();
  }
  post('BRIDGE_READY', { href: window.location.href });
})();
