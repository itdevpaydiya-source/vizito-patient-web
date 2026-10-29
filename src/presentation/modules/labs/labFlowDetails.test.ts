import {it,expect} from 'vitest';
import {combinedEstimate,packageCentres,partialCentres,homeCovers,labCity} from './labFlowDetails';
import type {LabHit,PublicPackage} from '../../../services/labHelper';
const lab=(id:string,centres:number[],total:number):LabHit=>({id,name:id,total,locations:centres.map(id=>({id,name:String(id),address:'',city:'Hyderabad',pincode:null,phone:null,total})),tests_offered:1,selected:[]});
it('estimates a full combined centre price, never a sum of separate minima',()=>{expect(combinedEstimate([lab('M',[1],450),lab('V',[2],470)])).toBe(450);expect(combinedEstimate([])).toBeNull();});
it('partial matches stay at one actual centre even within the same lab',()=>{const rows=partialCentres(['CBC','FBS'],{CBC:[lab('M',[1],300)],FBS:[lab('M',[2],150)]});expect(rows).toHaveLength(2);expect(rows[0].codes).toHaveLength(1);expect(rows[0].missing).toHaveLength(1);});
it('locks packages to their exact centres and adds extras at that centre',()=>{const pkg={price:900,lab:{id:'M',eligible_location_ids:[1]}} as PublicPackage;const rows=packageCentres([lab('M',[1,2],150),lab('V',[3],100)],pkg);expect(rows).toHaveLength(1);expect(rows[0].locations.map(c=>c.id)).toEqual([1]);expect(rows[0].total).toBe(1050);expect(packageCentres([lab('M',[2],150)],pkg)).toEqual([]);});
it('uses the location city and permits home collection only for a covered PIN',()=>{expect(labCity({label:'Kondapur, Hyderabad',city:'Hyderabad'} as any)).toBe('Hyderabad');const l=lab('M',[1],300);l.settings={centre_hours:{},home:{enabled:true,fee:100,pincodes:['500084'],open:'06:00',close:'12:00'}};expect(homeCovers(l,'500084')).toBe(true);expect(homeCovers(l,'500072')).toBe(false);expect(homeCovers(l)).toBe(false);});

it('does not send a locality or GPS label as the city while reverse lookup is pending',()=>{expect(labCity({label:'Kondapur'} as any)).toBe('');expect(labCity({label:'Your current location'} as any)).toBe('');});
