/** Test-only entry, excluded from the normal production build.
 * Credits are seeded through round rewards; gameplay uses the actual App/Runtime.
 */
import {createRoot} from 'react-dom/client';
import {App} from '../../src/presentation/ui/App';
import {Runtime} from '../../src/app/Runtime';
import '../../src/style.css';
async function createRuntime(){
 const r=await Runtime.create();
 for(let round=1;round<=50;round++)r.economy.awardRound(round);
 Object.assign(window,{
  m81Observe:()=>({position:r.getSnapshot().current.position,look:r.getLook(),combat:r.getCombatState(),
   weapon:r.getWeaponState(),economy:r.getEconomyState(),perks:r.perks.snapshot().map(p=>p.id),
   effects:r.perks.effects(),interaction:r.getInteraction(),lifecycle:r.lifecycle.state,doorOpen:r.isDoorOpen()}),
  // Exercise real AI windup/damage, not a direct damage setter.
  m81SpawnAttacker:()=>{const p=r.getSnapshot().current.position;r.enemies.spawn(p[0]-1,p[2]);},
 });
 return r;
}
createRoot(document.getElementById('root')!).render(<App createRuntime={createRuntime}/>);
