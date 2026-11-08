export type Action = 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'jump' | 'crouch' | 'interact' | 'pause' | 'fire' | 'ads' | 'reload' | 'beginRound';
const mapping: Record<string, Action> = { KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'sprint',ShiftRight:'sprint',Space:'jump',ControlLeft:'crouch',ControlRight:'crouch',KeyC:'crouch',KeyE:'interact',KeyR:'reload',KeyT:'beginRound',Escape:'pause' };
export interface InputSnapshot { held: ReadonlySet<Action>; pressed: ReadonlySet<Action>; moveX: number; moveY: number }
export class InputManager {
  private keys = new Set<string>(); private mouse = new Set<number>(); private mousePressed = new Set<Action>(); private pressed = new Set<Action>(); private attached = false;
  private keyDown = (e: KeyboardEvent) => { if ((e.target instanceof HTMLElement) && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return; const a=mapping[e.code]; if(!a)return; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault(); if(!this.keys.has(e.code))this.pressed.add(a); this.keys.add(e.code); };
  private keyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  private mouseDown = (e: MouseEvent) => { if (e.button!==0&&e.button!==2)return; const a:Action=e.button===0?'fire':'ads'; if(!this.mouse.has(e.button))this.mousePressed.add(a); this.mouse.add(e.button); };
  private mouseUp = (e: MouseEvent) => {this.mouse.delete(e.button);};
  private blur = () => this.clear();
  attach():void {if(this.attached)return;window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);window.addEventListener('mousedown',this.mouseDown);window.addEventListener('mouseup',this.mouseUp);this.attached=true;}
  detach():void {if(!this.attached)return;window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);window.removeEventListener('mousedown',this.mouseDown);window.removeEventListener('mouseup',this.mouseUp);this.attached=false;this.clear();}
  clear():void {this.keys.clear();this.mouse.clear();this.mousePressed.clear();this.pressed.clear();}
  snapshot():InputSnapshot {const held=new Set([...this.keys].map(k=>mapping[k]).filter((a):a is Action=>!!a));const pressed=new Set([...this.pressed,...this.mousePressed]);this.pressed.clear();this.mousePressed.clear();if(this.mouse.has(0))held.add('fire');if(this.mouse.has(2))held.add('ads');let moveX=Number(held.has('right'))-Number(held.has('left'));let moveY=Number(held.has('back'))-Number(held.has('forward'));const l=Math.hypot(moveX,moveY);if(l>1){moveX/=l;moveY/=l;}return {held,pressed,moveX,moveY};}
}
