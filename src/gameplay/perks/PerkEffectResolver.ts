import type {PerkDefinition,PerkModifiers} from './PerkRegistry';
/** Resolve from unique ownership, never incrementally accumulate effects on purchase. */
export class PerkEffectResolver {
 static resolve(perks:readonly Readonly<PerkDefinition>[]):Readonly<PerkModifiers>{
  const result:PerkModifiers={maxHealth:100,reloadMultiplier:1,speedMultiplier:1,damageMultiplier:1};
  const seen=new Set<string>();
  for(const perk of perks){
   if(seen.has(perk.id))continue;seen.add(perk.id);
   result.maxHealth=Math.max(result.maxHealth,perk.modifiers.maxHealth??100);
   result.reloadMultiplier*=perk.modifiers.reloadMultiplier??1;
   result.speedMultiplier*=perk.modifiers.speedMultiplier??1;
   result.damageMultiplier*=perk.modifiers.damageMultiplier??1;
  }
  return Object.freeze(result);
 }
}
