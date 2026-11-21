// Keyboard and mouse input. Movement keys, sneak, pebble throws on click,
// and single-press edge detection for menus (Enter, R, P, M, Esc).
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since last poll, cleared by consumePress
  let click = null; // {x, y} in canvas logical pixels, consumed by readClick
  let mouse = { x: 0, y: 0 };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(key);
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    mouse = canvasPoint(event.clientX, event.clientY);
  });
  canvas.addEventListener('click', (event) => {
    click = canvasPoint(event.clientX, event.clientY);
  });

  function axis(negKeys, posKeys) {
    let value = 0;
    if (negKeys.some((k) => keys.has(k))) value -= 1;
    if (posKeys.some((k) => keys.has(k))) value += 1;
    return value;
  }

  return {
    // Normalized movement vector from WASD or arrow keys.
    moveVector() {
      const x = axis(['a', 'arrowleft'], ['d', 'arrowright']);
      const y = axis(['w', 'arrowup'], ['s', 'arrowdown']);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    isMoving() {
      return this.moveVector().x !== 0 || this.moveVector().y !== 0;
    },
    isSneaking() {
      return keys.has('shift');
    },
    mousePosition() {
      return mouse;
    },
    // True once per physical key press.
    consumePress(key) {
      const wanted = key.toLowerCase();
      if (pressed.has(wanted)) {
        pressed.delete(wanted);
        return true;
      }
      return false;
    },
    consumeAnyPress() {
      if (pressed.size > 0) {
        pressed.clear();
        return true;
      }
      return false;
    },
    // The latest click, or null. Reading it consumes it.
    readClick() {
      const point = click;
      click = null;
      return point;
    },
    clearPresses() {
      pressed.clear();
    },
  };
}
