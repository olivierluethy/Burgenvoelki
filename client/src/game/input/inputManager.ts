import type { Vec2 } from '@shared';

/**
 * Central keyboard + mouse input. A singleton listening to window events, read
 * each tick by the runtime. Abstracted so a gamepad source can be added later
 * without touching callers (STYLEGUIDE / plan controls contract).
 */
class InputManager {
  private keys = new Set<string>();
  /** Pointer position in normalised device coords (-1..1). */
  pointer: Vec2 = { x: 0, z: 0 };
  private mouseDown = false;

  // rising-edge latches consumed by the runtime
  private dashQueued = false;
  private interactQueued = false;
  private throwReleaseQueued = false;
  private escQueued = false;

  private attached = false;

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('contextmenu', this.onContextMenu);
    this.reset();
  }

  private reset() {
    this.keys.clear();
    this.mouseDown = false;
    this.dashQueued = false;
    this.interactQueued = false;
    this.throwReleaseQueued = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'Escape') {
      this.escQueued = true;
      return;
    }
    // ignore repeats for edge-triggered keys
    if (!e.repeat) {
      if (code === 'Space') this.dashQueued = true;
      if (code === 'KeyE') this.interactQueued = true;
    }
    this.keys.add(code);
    // prevent page scroll on space / arrows
    if (code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.z = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0 && this.mouseDown) {
      this.mouseDown = false;
      this.throwReleaseQueued = true;
    }
  };

  private onBlur = () => this.reset();
  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  // --- reads ---

  moveVector(): Vec2 {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    return { x, z };
  }

  sprint(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  throwHeld(): boolean {
    return this.mouseDown;
  }

  /** Consume the dash rising-edge (true once per press). */
  consumeDash(): boolean {
    const v = this.dashQueued;
    this.dashQueued = false;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumeThrowRelease(): boolean {
    const v = this.throwReleaseQueued;
    this.throwReleaseQueued = false;
    return v;
  }

  consumeEsc(): boolean {
    const v = this.escQueued;
    this.escQueued = false;
    return v;
  }
}

export const inputManager = new InputManager();
