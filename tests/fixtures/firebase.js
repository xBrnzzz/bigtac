// Synthetic data only, served by the isolated test server. Never imported by the application.

export const db = {};
const scenario = new URLSearchParams(location.search).get('scenario') || 'normal';
const choices = [
 {title:'Taille',type:'radio',min:1,max:1,options:[{name:'M',price:0},{name:'L',price:10},{name:'XL',price:23}]},
 {title:'Sauces',type:'checkbox',min:1,max:2,options:[{name:'Algérienne',price:0},{name:'Barbecue',price:0},{name:'Fromagère',price:2}]}
];
const base={imageUrl:'assets/tacos-hero.jpg',isVisible:true,mandatoryChoices:[],supplements:[]};
const items = [
 {...base,id:'tacos',name:'Tacos Poulet',category:'Tacos Français',price:22,description:'Poulet, frites et sauce fromagère. Composez-le à votre goût.',isPopular:true,mandatoryChoices:choices,supplements:[{name:'Cheddar',price:5},{name:'Frites',price:4}]},
 {...base,id:'single',name:'Tacos Mixte',category:'Tacos Français',price:25,description:'Deux viandes au choix, une pause bien généreuse.',mandatoryChoices:[{title:'Viandes',type:'checkbox',min:2,max:2,options:[{name:'Poulet',price:0},{name:'Viande hachée',price:2},{name:'Cordon bleu',price:3}]}]},
 {...base,id:'simple',name:'Poulet Gratiné',category:'Gratinés',price:27,description:'Le tacos au poulet sous une couche de fromage fondant.',isPopular:true},
 {...base,id:'optional',name:'Burger Maison',category:'Burgers',price:30,description:'Steak, fromage, salade et sauce.',mandatoryChoices:[{title:'Sauce en plus',type:'checkbox',min:0,max:1,options:[{name:'BBQ',price:2},{name:'Harissa',price:0}]}]},
 {...base,id:'supplements',name:'Frites',category:'À côté',price:10,description:'Une portion de frites pour accompagner votre commande.',supplements:[{name:'Sauce cheddar',price:4},{name:'Jalapeños',price:3}]}
];
const promotions=[{...base,id:'promo',isPromo:true,name:'Menu Tacos',price:35,description:'Un tacos, des frites et une boisson.',mandatoryChoices:[choices[0]]}];
const categories=['Tacos Français','Gratinés','Burgers','À côté'];
const categoryRows=categories.map((name,i)=>({id:'cat'+i,name,order:i}));
const catalogListeners=new Set();
window.__fixture={orders:[],failMenu:scenario==='error',failSubmission:scenario==='submit-error',failTracking:scenario==='tracker-error',state:'pending',tracker:null,setStatus(status){this.state=status;this.tracker?.({exists:()=>true,data:()=>({shortId:1234,status,type:'livraison'})});}};
Object.assign(window.__fixture,{settings:{isOpen:scenario!=='closed',whatsappMode:scenario==='whatsapp'},promotions,settingsListeners:new Set(),emitSettings(){for(const cb of this.settingsListeners)cb({exists:()=>true,data:()=>this.settings});},menuItems:items,categories:categoryRows,catalogListeners,emitCatalog(){for(const listener of catalogListeners)getDocs(listener.ref).then(listener.next,listener.error);}});
export const collection=(_,name)=>name;
export const doc=(_,name,id)=>({name,id});
export const query=x=>x;
export const orderBy=()=>null;
export const serverTimestamp=()=>new Date();
export const getDocs=async name=>{
 await new Promise(r=>setTimeout(r,scenario==='loading'?1800:80));
 if(window.__fixture.failMenu&&name==='menuItems')throw new Error('Mock network failure');
 const rows=scenario==='empty'?[]:name==='menuItems'?items:name==='categories'?categoryRows:promotions;
 return {docs:rows.map(x=>({id:x.id,data:()=>x})),forEach:fn=>rows.forEach(x=>fn({id:x.id,data:()=>x})),empty:!rows.length};
};
export const onSnapshot=(ref,callback,error,extraError)=>{
 if(typeof callback!=='function'&&!callback?.next){callback=error;error=extraError;}
 if(typeof ref==='string'&&['menuItems','categories','promotions'].includes(ref)) {
   const listener={ref,next:callback,error};catalogListeners.add(listener);getDocs(ref).then(value=>{if(catalogListeners.has(listener))callback(value);},error);
   return ()=>catalogListeners.delete(listener);
 }
 if(ref.name==='settings'){window.__fixture.settingsListeners.add(callback);callback({exists:()=>true,data:()=>window.__fixture.settings});return ()=>window.__fixture.settingsListeners.delete(callback);}
 else if(ref.name==='orders'){
   const next=typeof callback==='function'?callback:callback.next;
   window.__fixture.tracker=next;
   if(window.__fixture.failTracking) callback.error?.(new Error('Mock tracker failure'));
   else next({exists:()=>true,data:()=>({shortId:1234,status:window.__fixture.state,type:'livraison'})});
 }
 return ()=>{};
};
export const addDoc=async (_,order)=>{
 if(window.__fixture.failSubmission)throw new Error('Mock submission failure');
 window.__fixture.orders.push(order);return{id:'fixture-order'};
};
