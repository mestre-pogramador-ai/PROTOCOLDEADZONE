import {describe,it,expect} from 'vitest';
import {CONTAINMENT_MODULES,DOOR,NAV_NODES,validateContainmentMap} from '../world/maps/containment';
describe('M1 — Sala de Contenção',()=>{
 it('módulos têm IDs e dimensões válidos',()=>expect(validateContainmentMap()).toEqual([]));
 it('porta fica no limite leste da sala',()=>{expect(DOOR.position[0]).toBe(8);expect(DOOR.size[2]).toBeGreaterThanOrEqual(1.6);});
 it('ambiente contém piso, paredes e props com colisão',()=>{expect(CONTAINMENT_MODULES.some(m=>m.kind==='floor'&&m.collision)).toBe(true);expect(CONTAINMENT_MODULES.filter(m=>m.kind==='wall').length).toBeGreaterThanOrEqual(6);expect(CONTAINMENT_MODULES.filter(m=>m.kind==='prop').length).toBeGreaterThanOrEqual(5);});
 it('grafo de navegação tem ligação pela porta',()=>{expect(NAV_NODES.find(n=>n.id==='containment-door')?.requiresOpenDoor).toBe(DOOR.id);});
});
