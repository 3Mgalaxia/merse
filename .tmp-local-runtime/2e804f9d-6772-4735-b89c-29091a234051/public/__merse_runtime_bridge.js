(function () {
  if (window.__MERSE_RUNTIME_BRIDGE_READY__) return;
  window.__MERSE_RUNTIME_BRIDGE_READY__ = true;

  var BRIDGE_SOURCE = 'MERSE_RUNTIME_BRIDGE';
  var PARENT_SOURCE = 'MERSE_PARENT';
  var STYLE_ID = '__merse_runtime_bridge_style__';
  var SELECTED_CLASS = '__merse_runtime_selected__';
  var FLOAT_BUTTON_ID = '__merse_runtime_fab__';
  var FLOAT_BUTTON_LABEL_ID = '__merse_runtime_fab_label__';
  var FLOAT_PANEL_ID = '__merse_runtime_fab_panel__';
  var FLOAT_PANEL_SELECT_ID = '__merse_runtime_fab_select__';
  var FLOAT_PANEL_CLEAR_ID = '__merse_runtime_fab_clear__';
  var FLOAT_PANEL_PROMPT_ID = '__merse_runtime_fab_prompt__';
  var FLOAT_PANEL_FILE_ID = '__merse_runtime_fab_file__';
  var FLOAT_PANEL_SEND_ID = '__merse_runtime_fab_send__';
  var FLOAT_PANEL_MOVE_UP_ID = '__merse_runtime_fab_move_up__';
  var FLOAT_PANEL_MOVE_DOWN_ID = '__merse_runtime_fab_move_down__';
  var FLOAT_PANEL_MOVE_LEFT_ID = '__merse_runtime_fab_move_left__';
  var FLOAT_PANEL_MOVE_RIGHT_ID = '__merse_runtime_fab_move_right__';
  var FLOAT_PANEL_STATUS_ID = '__merse_runtime_fab_status__';
  var enabled = false;
  var selectedElement = null;
  var selectedMeta = null;
  var panelOpen = false;
  var dockPosition = 'br';
  var dragState = { active: false, moved: false, pointerId: null, startX: 0, startY: 0 };

  function post(type, payload) {
    var message = { source: BRIDGE_SOURCE, type: type, payload: payload || {} };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, '*');
    }
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
      '  cursor: grab;',
      '  user-select: none;',
      '  touch-action: none;',
      '  z-index: 2147483647;',
      '  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;',
      '}',
      '#' + FLOAT_BUTTON_ID + '.__dock_br { right: 18px; bottom: 18px; left: auto; top: auto; }',
      '#' + FLOAT_BUTTON_ID + '.__dock_bl { left: 18px; bottom: 18px; right: auto; top: auto; }',
      '#' + FLOAT_BUTTON_ID + '.__dock_tr { right: 18px; top: 18px; left: auto; bottom: auto; }',
      '#' + FLOAT_BUTTON_ID + '.__dock_tl { left: 18px; top: 18px; right: auto; bottom: auto; }',
      '#' + FLOAT_BUTTON_ID + '.__merse_runtime_fab_dragging {',
      '  cursor: grabbing;',
      '  transition: none !important;',
      '}',
      '#' + FLOAT_BUTTON_ID + ':not(.__merse_runtime_fab_dragging):hover {',
      '  transform: translateY(-2px) scale(1.02);',
      '  box-shadow: 0 20px 36px rgba(56, 18, 117, 0.55), inset 0 1px 0 rgba(255,255,255,0.3);',
      '}',
      '#' + FLOAT_BUTTON_ID + ':not(.__merse_runtime_fab_dragging):active {',
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
      '#' + FLOAT_PANEL_ID + ' {',
      '  position: fixed;',
      '  width: 230px;',
      '  border-radius: 16px;',
      '  border: 1px solid rgba(196, 181, 253, 0.32);',
      '  background: linear-gradient(155deg, rgba(67, 24, 121, 0.45), rgba(31, 17, 75, 0.34));',
      '  box-shadow: 0 18px 42px rgba(25, 8, 61, 0.52), inset 0 1px 0 rgba(255,255,255,0.2);',
      '  backdrop-filter: blur(16px) saturate(130%);',
      '  -webkit-backdrop-filter: blur(16px) saturate(130%);',
      '  padding: 10px;',
      '  z-index: 2147483646;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '}',
      '#' + FLOAT_PANEL_ID + '.__panel_hidden { display: none; }',
      '#' + FLOAT_PANEL_ID + '.__panel_br { right: 18px; bottom: 84px; left: auto; top: auto; }',
      '#' + FLOAT_PANEL_ID + '.__panel_bl { left: 18px; bottom: 84px; right: auto; top: auto; }',
      '#' + FLOAT_PANEL_ID + '.__panel_tr { right: 18px; top: 84px; left: auto; bottom: auto; }',
      '#' + FLOAT_PANEL_ID + '.__panel_tl { left: 18px; top: 84px; right: auto; bottom: auto; }',
      '#' + FLOAT_PANEL_ID + ' .__merse_runtime_panel_title {',
      '  margin: 0;',
      '  font: 700 11px/1.2 ui-sans-serif, system-ui, sans-serif;',
      '  letter-spacing: 0.08em;',
      '  text-transform: uppercase;',
      '  color: rgba(245, 243, 255, 0.96);',
      '}',
      '#' + FLOAT_PANEL_ID + ' .__merse_runtime_panel_hint {',
      '  margin: 0;',
      '  font: 500 10px/1.25 ui-sans-serif, system-ui, sans-serif;',
      '  color: rgba(233, 213, 255, 0.8);',
      '}',
      '#' + FLOAT_PANEL_STATUS_ID + ' {',
      '  margin: 0;',
      '  min-height: 14px;',
      '  font: 600 10px/1.2 ui-sans-serif, system-ui, sans-serif;',
      '  color: rgba(233, 213, 255, 0.78);',
      '}',
      '#' + FLOAT_PANEL_ID + ' button {',
      '  border: 1px solid rgba(196, 181, 253, 0.34);',
      '  border-radius: 10px;',
      '  background: rgba(167, 139, 250, 0.16);',
      '  color: rgba(248, 245, 255, 0.96);',
      '  padding: 7px 9px;',
      '  font: 600 11px/1.2 ui-sans-serif, system-ui, sans-serif;',
      '  cursor: pointer;',
      '  text-align: left;',
      '  transition: background-color 160ms ease, border-color 160ms ease;',
      '}',
      '#' + FLOAT_PANEL_ID + ' button:hover {',
      '  background: rgba(167, 139, 250, 0.25);',
      '  border-color: rgba(216, 180, 254, 0.56);',
      '}',
      '#' + FLOAT_PANEL_ID + ' textarea {',
      '  width: 100%;',
      '  min-height: 64px;',
      '  resize: vertical;',
      '  border-radius: 10px;',
      '  border: 1px solid rgba(196, 181, 253, 0.34);',
      '  background: rgba(17, 10, 36, 0.58);',
      '  color: rgba(248, 245, 255, 0.96);',
      '  font: 500 11px/1.35 ui-sans-serif, system-ui, sans-serif;',
      '  padding: 7px 8px;',
      '  outline: none;',
      '}',
      '#' + FLOAT_PANEL_ID + ' textarea::placeholder { color: rgba(233, 213, 255, 0.5); }',
      '#' + FLOAT_PANEL_ID + ' input[type="file"] {',
      '  width: 100%;',
      '  border-radius: 10px;',
      '  border: 1px solid rgba(196, 181, 253, 0.26);',
      '  background: rgba(17, 10, 36, 0.45);',
      '  color: rgba(248, 245, 255, 0.9);',
      '  font: 500 10px/1.2 ui-sans-serif, system-ui, sans-serif;',
      '  padding: 5px 7px;',
      '}',
      '#' + FLOAT_PANEL_ID + ' input[type="file"]::file-selector-button {',
      '  border: 0;',
      '  border-radius: 8px;',
      '  background: rgba(139, 92, 246, 0.35);',
      '  color: rgba(250, 245, 255, 0.95);',
      '  padding: 4px 7px;',
      '  margin-right: 8px;',
      '  cursor: pointer;',
      '}',
      '#' + FLOAT_PANEL_ID + ' .__merse_runtime_move_grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(3, minmax(0, 1fr));',
      '  gap: 5px;',
      '}',
      '#' + FLOAT_PANEL_ID + ' .__merse_runtime_move_grid button {',
      '  text-align: center;',
      '  padding: 6px 0;',
      '}',
      '#' + FLOAT_PANEL_ID + ' .__merse_runtime_send {',
      '  background: rgba(139, 92, 246, 0.28);',
      '  border-color: rgba(216, 180, 254, 0.58);',
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

  function applyDockPosition(position) {
    var next = position;
    if (next !== 'tl' && next !== 'tr' && next !== 'bl' && next !== 'br') next = 'br';
    dockPosition = next;
    var button = document.getElementById(FLOAT_BUTTON_ID);
    if (button instanceof HTMLElement) {
      button.classList.remove('__dock_tl', '__dock_tr', '__dock_bl', '__dock_br');
      button.classList.add('__dock_' + next);
    }
    var panel = document.getElementById(FLOAT_PANEL_ID);
    if (panel instanceof HTMLElement) {
      panel.classList.remove('__panel_tl', '__panel_tr', '__panel_bl', '__panel_br');
      panel.classList.add('__panel_' + next);
    }
  }

  function resolveDockPosition(clientX, clientY) {
    var horizontal = clientX <= window.innerWidth / 2 ? 'l' : 'r';
    var vertical = clientY <= window.innerHeight / 2 ? 't' : 'b';
    return vertical + horizontal;
  }

  function setPanelOpen(nextOpen) {
    panelOpen = Boolean(nextOpen);
    var panel = document.getElementById(FLOAT_PANEL_ID);
    if (panel instanceof HTMLElement) {
      panel.classList.toggle('__panel_hidden', !panelOpen);
    }
    var button = document.getElementById(FLOAT_BUTTON_ID);
    if (button instanceof HTMLElement) {
      button.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    }
  }

  function updateFloatingButtonState() {
    var button = document.getElementById(FLOAT_BUTTON_ID);
    if (!(button instanceof HTMLElement)) return;
    var badge = document.getElementById(FLOAT_BUTTON_LABEL_ID);
    var selectButton = document.getElementById(FLOAT_PANEL_SELECT_ID);
    if (enabled) {
      button.classList.add('__merse_runtime_fab_on');
      if (badge) badge.textContent = 'ON';
      if (selectButton instanceof HTMLElement) selectButton.textContent = 'Desativar selecao';
      return;
    }
    button.classList.remove('__merse_runtime_fab_on');
    if (badge) badge.textContent = 'OFF';
    if (selectButton instanceof HTMLElement) selectButton.textContent = 'Ativar selecao';
  }

  function ensureFloatingPanel() {
    if (!(document.body instanceof HTMLElement)) return;
    if (document.getElementById(FLOAT_PANEL_ID)) {
      applyDockPosition(dockPosition);
      updateFloatingButtonState();
      return;
    }

    var panel = document.createElement('div');
    panel.id = FLOAT_PANEL_ID;
    panel.className = '__panel_hidden __panel_br';
    panel.innerHTML = [
      '<p class="__merse_runtime_panel_title">Mini Aba</p>',
      '<p class="__merse_runtime_panel_hint">Arraste o botao para um canto, mova elementos, escreva prompt e envie para API.</p>',
      '<p id="' + FLOAT_PANEL_STATUS_ID + '"></p>',
      '<textarea id="' + FLOAT_PANEL_PROMPT_ID + '" placeholder="Descreva a mudanca no componente selecionado..."></textarea>',
      '<input type="file" id="' + FLOAT_PANEL_FILE_ID + '" />',
      '<button type="button" id="' + FLOAT_PANEL_SEND_ID + '" class="__merse_runtime_send">Enviar prompt para API</button>',
      '<button type="button" id="' + FLOAT_PANEL_SELECT_ID + '">Ativar selecao</button>',
      '<button type="button" id="' + FLOAT_PANEL_CLEAR_ID + '">Limpar selecao</button>',
      '<div class="__merse_runtime_move_grid">',
        '<span></span>',
        '<button type="button" id="' + FLOAT_PANEL_MOVE_UP_ID + '">↑</button>',
        '<span></span>',
        '<button type="button" id="' + FLOAT_PANEL_MOVE_LEFT_ID + '">←</button>',
        '<span></span>',
        '<button type="button" id="' + FLOAT_PANEL_MOVE_RIGHT_ID + '">→</button>',
        '<span></span>',
        '<button type="button" id="' + FLOAT_PANEL_MOVE_DOWN_ID + '">↓</button>',
        '<span></span>',
      '</div>',
    ].join('');

    panel.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    document.body.appendChild(panel);

    var selectButton = document.getElementById(FLOAT_PANEL_SELECT_ID);
    if (selectButton instanceof HTMLElement) {
      selectButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setSelectMode(!enabled);
      });
    }

    var clearButton = document.getElementById(FLOAT_PANEL_CLEAR_ID);
    if (clearButton instanceof HTMLElement) {
      clearButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        clearSelected();
        post('SELECTION_CLEARED', {});
      });
    }

    var moveButtons = [
      { id: FLOAT_PANEL_MOVE_UP_ID, dx: 0, dy: -14 },
      { id: FLOAT_PANEL_MOVE_DOWN_ID, dx: 0, dy: 14 },
      { id: FLOAT_PANEL_MOVE_LEFT_ID, dx: -14, dy: 0 },
      { id: FLOAT_PANEL_MOVE_RIGHT_ID, dx: 14, dy: 0 },
    ];
    moveButtons.forEach(function (entry) {
      var buttonEl = document.getElementById(entry.id);
      if (!(buttonEl instanceof HTMLElement)) return;
      buttonEl.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        moveSelected(entry.dx, entry.dy);
      });
    });

    var sendButton = document.getElementById(FLOAT_PANEL_SEND_ID);
    var promptInput = document.getElementById(FLOAT_PANEL_PROMPT_ID);
    var fileInput = document.getElementById(FLOAT_PANEL_FILE_ID);
    var statusText = document.getElementById(FLOAT_PANEL_STATUS_ID);
    if (sendButton instanceof HTMLElement) {
      sendButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var promptValue = promptInput instanceof HTMLTextAreaElement ? promptInput.value.trim() : '';
        var selectedFile = fileInput instanceof HTMLInputElement && fileInput.files ? fileInput.files[0] : null;

        if (!promptValue && !selectedFile) {
          if (statusText instanceof HTMLElement) statusText.textContent = 'Escreva prompt ou anexe arquivo.';
          return;
        }

        if (!selectedFile) {
          if (statusText instanceof HTMLElement) statusText.textContent = 'Enviando para API...';
          post('PANEL_PROMPT_SUBMIT', { prompt: promptValue, attachment: null });
          if (promptInput instanceof HTMLTextAreaElement) promptInput.value = '';
          return;
        }

        var reader = new FileReader();
        reader.onload = function () {
          var value = typeof reader.result === 'string' ? reader.result : '';
          var parts = value.split(',');
          var contentBase64 = parts.length > 1 ? parts[1] : '';
          post('PANEL_PROMPT_SUBMIT', {
            prompt: promptValue,
            attachment: {
              name: selectedFile.name || 'arquivo',
              mimeType: selectedFile.type || 'application/octet-stream',
              size: Number(selectedFile.size || 0),
              contentBase64: contentBase64,
            },
          });
          if (statusText instanceof HTMLElement) statusText.textContent = 'Enviando para API...';
          if (promptInput instanceof HTMLTextAreaElement) promptInput.value = '';
          if (fileInput instanceof HTMLInputElement) fileInput.value = '';
        };
        reader.onerror = function () {
          if (statusText instanceof HTMLElement) statusText.textContent = 'Falha ao ler arquivo anexado.';
          post('PANEL_PROMPT_SUBMIT', { prompt: promptValue, attachment: null });
        };
        reader.readAsDataURL(selectedFile);
      });
    }

    applyDockPosition(dockPosition);
    updateFloatingButtonState();
  }

  function ensureFloatingButton() {
    if (!(document.body instanceof HTMLElement)) return;
    if (document.getElementById(FLOAT_BUTTON_ID)) {
      applyDockPosition(dockPosition);
      updateFloatingButtonState();
      return;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.id = FLOAT_BUTTON_ID;
    button.className = '__dock_br';
    button.setAttribute('aria-label', 'Ferramentas');
    button.setAttribute('title', 'Ferramentas');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = [
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
      '<path d="M14.7 6.3a3.9 3.9 0 0 0 3.9 3.9c.5 0 .9-.1 1.3-.2a5.6 5.6 0 0 1-7.6 7.6c.1-.4.2-.8.2-1.3a3.9 3.9 0 0 0-3.9-3.9c-.5 0-.9.1-1.3.2a5.6 5.6 0 0 1 7.6-7.6c-.1.4-.2.8-.2 1.3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="m5.2 18.8 3.1-3.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      '</svg>',
      '<span id="' + FLOAT_BUTTON_LABEL_ID + '">OFF</span>',
    ].join('');

    button.addEventListener('pointerdown', function (event) {
      dragState.active = true;
      dragState.moved = false;
      dragState.pointerId = event.pointerId;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      button.classList.add('__merse_runtime_fab_dragging');
      button.style.transform = '';
      if (typeof button.setPointerCapture === 'function') {
        button.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    });

    button.addEventListener('pointermove', function (event) {
      if (!dragState.active || event.pointerId !== dragState.pointerId) return;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) >= 8) {
        dragState.moved = true;
      }
      if (!dragState.moved) return;
      button.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      if (panelOpen) setPanelOpen(false);
      event.preventDefault();
      event.stopPropagation();
    });

    function finishPointer(event) {
      if (!dragState.active || event.pointerId !== dragState.pointerId) return;
      var wasMoved = dragState.moved;
      var clientX = event.clientX;
      var clientY = event.clientY;
      dragState.active = false;
      dragState.moved = false;
      dragState.pointerId = null;
      button.classList.remove('__merse_runtime_fab_dragging');
      button.style.transform = '';
      if (typeof button.releasePointerCapture === 'function') {
        try {
          button.releasePointerCapture(event.pointerId);
        } catch (error) {
          // ignore release errors
        }
      }
      if (wasMoved) {
        applyDockPosition(resolveDockPosition(clientX, clientY));
      } else {
        setPanelOpen(!panelOpen);
      }
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }

    button.addEventListener('pointerup', finishPointer);
    button.addEventListener('pointercancel', finishPointer);

    document.body.appendChild(button);
    applyDockPosition(dockPosition);
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
    if (target.id === FLOAT_PANEL_ID || (typeof target.closest === 'function' && target.closest('#' + FLOAT_PANEL_ID))) {
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

    if (data.type === 'MERSE_BRIDGE_PROMPT_RESULT') {
      var resultPayload = data.payload || {};
      var statusText = document.getElementById(FLOAT_PANEL_STATUS_ID);
      var ok = Boolean(resultPayload.ok);
      var message = typeof resultPayload.message === 'string' ? resultPayload.message : '';
      if (statusText instanceof HTMLElement) {
        statusText.textContent = message || (ok ? 'Prompt aplicado.' : 'Falha ao aplicar prompt.');
      }
      if (ok) {
        setTimeout(function () {
          window.location.reload();
        }, 180);
      }
      return;
    }

    if (data.type === 'MERSE_BRIDGE_PING') {
      post('BRIDGE_READY', { href: window.location.href });
    }
  });

  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('pointerdown', function (event) {
    if (!panelOpen) return;
    var target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === FLOAT_BUTTON_ID || target.id === FLOAT_PANEL_ID) return;
    if (typeof target.closest === 'function' && (target.closest('#' + FLOAT_BUTTON_ID) || target.closest('#' + FLOAT_PANEL_ID))) return;
    setPanelOpen(false);
  }, true);
  window.addEventListener('resize', function () {
    applyDockPosition(dockPosition);
  });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    setSelectMode(false);
    clearSelected();
    setPanelOpen(false);
    post('SELECTION_CLEARED', {});
  });

  function ensureFloatingControls() {
    ensureFloatingButton();
    ensureFloatingPanel();
    applyDockPosition(dockPosition);
    updateFloatingButtonState();
  }

  ensureStyleTag();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFloatingControls, { once: true });
  } else {
    ensureFloatingControls();
  }
  post('BRIDGE_READY', { href: window.location.href });
})();
