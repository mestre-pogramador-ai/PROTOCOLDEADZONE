export interface PerkModifiers {maxHealth:number;reloadMultiplier:number;speedMultiplier:number;damageMultiplier:number}
export interface PerkDefinition {id:string;name:string;price:number;icon:string;color:string;description:string;modifiers:Readonly<Partial<PerkModifiers>>}
export const RESERVED_PERKS=['conductor','ironLungs'] as const; // No mechanics or purchasable entries yet.
export const PERK_DEFINITIONS:readonly PerkDefinition[]=[
 {id:'vitality',name:'Vitalidade',price:2500,icon:'V',color:'#e97383',description:'Vida máxima 150 · +50 HP ao adquirir',modifiers:{maxHealth:150}},
 {id:'quickHands',name:'Mãos Rápidas',price:2000,icon:'R',color:'#f3c969',description:'Recarga 25% mais rápida · próxima recarga',modifiers:{reloadMultiplier:.75}},
 {id:'impulse',name:'Impulso',price:2000,icon:'I',color:'#75d9bf',description:'Velocidade +12% · salto inalterado',modifiers:{speedMultiplier:1.12}},
 {id:'reactiveArmor',name:'Blindagem Reativa',price:3500,icon:'B',color:'#8faeee',description:'Dano recebido -15%',modifiers:{damageMultiplier:.85}},
];
export class PerkRegistry {
 private readonly definitions=new Map<string,Readonly<PerkDefinition>>();
 constructor(definitions:readonly PerkDefinition[]=PERK_DEFINITIONS){
  for(const definition of definitions){
   if(!definition.id||this.definitions.has(definition.id)||!Number.isSafeInteger(definition.price)||definition.price<=0)
    throw new Error('Definição de perk inválida');
   for(const value of Object.values(definition.modifiers))if(!Number.isFinite(value)||value<=0)throw new Error('Modificador inválido');
   this.definitions.set(definition.id,Object.freeze({...definition,modifiers:Object.freeze({...definition.modifiers})}));
  }
 }
 get(id:string):Readonly<PerkDefinition>|undefined{return this.definitions.get(id);}
 all():readonly Readonly<PerkDefinition>[] {return [...this.definitions.values()];}
}
export const perkRegistry=new PerkRegistry();
