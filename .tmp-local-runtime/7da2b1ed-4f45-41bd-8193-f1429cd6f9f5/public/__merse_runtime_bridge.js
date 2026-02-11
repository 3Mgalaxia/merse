(function () {
  if (window.__MERSE_RUNTIME_BRIDGE_READY__) return;
  window.__MERSE_RUNTIME_BRIDGE_READY__ = true;

  var BRIDGE_SOURCE = 'MERSE_RUNTIME_BRIDGE';
  var PARENT_SOURCE = 'MERSE_PARENT';
  var STYLE_ID = '__merse_runtime_bridge_style__';
  var SELECTED_CLASS = '__merse_runtime_selected__';
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

  function setSelectMode(nextEnabled) {
    enabled = Boolean(nextEnabled);
    document.documentElement.style.cursor = enabled ? 'crosshair' : '';
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
  post('BRIDGE_READY', { href: window.location.href });
})();
