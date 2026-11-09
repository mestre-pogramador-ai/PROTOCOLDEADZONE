type Level = 'info' | 'warning' | 'error';
type Entry = { seconds: number; level: Level; code: string; values: Record<string, number | boolean> };
/** Bounded, numeric-only telemetry. Never collects URLs, storage, input text or error messages. */
export class Diagnostics {
  private entries: Entry[] = [];
  private readonly started = performance.now();
  constructor(private readonly capacity = 256) {}
  record(level: Level, code: string, values: Record<string, number | boolean> = {}): void {
    const safe: Record<string, number | boolean> = {};
    for (const [key,value] of Object.entries(values))
      if (/^[a-zA-Z0-9_.-]{1,40}$/.test(key) && (typeof value === 'boolean' || Number.isFinite(value))) safe[key]=value;
    this.entries.push({seconds: +( (performance.now()-this.started)/1000).toFixed(3),level,
      code: /^[a-zA-Z0-9_.-]{1,64}$/.test(code)?code:'invalid.code',values:safe});
    if(this.entries.length>this.capacity)this.entries.shift();
  }
  report(): string { return JSON.stringify({version:'M7',entries:this.entries},null,2); }
}
export const diagnostics = new Diagnostics();
export function downloadDiagnostics(): void {
  diagnostics.record('info','report.export');
  const url=URL.createObjectURL(new Blob([diagnostics.report()],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='protocol-dead-zone-errors.json';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function attachDiagnostics(): () => void {
  const error=(event:ErrorEvent)=>diagnostics.record('error','browser.error',{line:event.lineno,column:event.colno});
  const rejection=()=>diagnostics.record('error','browser.unhandledrejection');
  const key=(event:KeyboardEvent)=>{
    if(event.repeat)return;
    if(event.code==='F8'){event.preventDefault();diagnostics.record('warning','user.marker');}
    if(event.code==='F9'){event.preventDefault();downloadDiagnostics();}
  };
  const warn=console.warn;
  console.warn=(...args:unknown[])=>{diagnostics.record('warning','console.warning');warn.apply(console,args);};
  window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);window.addEventListener('keydown',key);
  return ()=>{console.warn=warn;window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection);window.removeEventListener('keydown',key);};
}
