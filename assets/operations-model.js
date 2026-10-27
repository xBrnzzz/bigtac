// Local compatibility contracts. Discount previews are never order authorization.
import {groupIssues} from './menu-model.js';
export const DISCOUNT_RULES_ENABLED=false;
export const cents=value=>{
    if(!['string','number'].includes(typeof value)||!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error('Montant invalide (deux décimales maximum).');
    const n=Math.round(Number(value)*100);if(!Number.isSafeInteger(n)||n>100000000)throw Error('Montant hors limite.');return n;
};
export const validZone=zone=>{try{new Intl.DateTimeFormat('fr',{timeZone:zone}).format();return typeof zone==='string'&&!!zone;}catch{return false;}};
export const instant=value=>value==null||value===''?null:value?.toDate?value.toDate().getTime():value?.seconds!=null?value.seconds*1000:Date.parse(value);
export function promotionState(p,now=Date.now()){
    const start=instant(p.startsAt),end=instant(p.endsAt);
    if(p.isVisible===false)return 'disabled';
    if(start!==null&&!Number.isFinite(start)||end!==null&&!Number.isFinite(end)||start!==null&&end!==null&&start>=end)return 'invalid';
    return end!==null&&now>=end?'expired':start!==null&&now<start?'scheduled':'active';
}
export const stateLabels={disabled:'Désactivée',invalid:'Dates invalides',expired:'Expirée',scheduled:'Programmée',active:'Active'};
export function offerIssues(p){
    const issues=[];if(!String(p.name||'').trim())issues.push('Indiquez le nom de l’offre.');
    try{cents(p.price);}catch(e){issues.push(e.message);}
    if(promotionState({...p,isVisible:true})==='invalid')issues.push('Vérifiez les dates : la fin doit suivre le début.');
    for(const g of p.mandatoryChoices||[])issues.push(...groupIssues(g));
    if(p.supplements?.length)issues.push(...groupIssues({title:'Suppléments',type:'checkbox',min:0,max:0,options:p.supplements}));
    return [...new Set(issues)];
}
export function localInstant(value,zone='Africa/Casablanca'){
    if(!value)return null;if(!validZone(zone)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))throw Error('Date ou fuseau invalide.');
    const base=Date.parse(value+'Z'),fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const matches=[];for(let offset=-840;offset<=840;offset+=15){const date=new Date(base+offset*60000);if(fmt.format(date).replace(' ','T')===value)matches.push(date.toISOString());}
    if(matches.length!==1)throw Error('Cette heure est inexistante ou ambiguë dans ce fuseau. Choisissez une autre heure.');return matches[0];
}
export function localInput(value,zone='Africa/Casablanca'){
    const n=instant(value);if(n===null||!Number.isFinite(n))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(n).replace(' ','T');
}
export function discountIssues(rule,products,categories){
    const issues=[];if(!String(rule.name||'').trim())issues.push('Nom requis.');
    if(!['percentage','fixed'].includes(rule.type))issues.push('Type de remise invalide.');
    let value;try{value=cents(rule.value);if(!value)throw Error();}catch{issues.push('Valeur positive requise.');}
    if(rule.type==='percentage'&&value>10000)issues.push('Le pourcentage dépasse 100 %.');
    if(promotionState({...rule,isVisible:true})==='invalid')issues.push('Dates invalides.');
    const ids=rule.productIds||[],cats=rule.categoryIds||[];
    if(!Array.isArray(ids)||!Array.isArray(cats))return [...issues,'Cibles invalides.'];
    if(!ids.length&&!cats.length)issues.push('Choisissez des produits ou catégories.');
    if(ids.some(id=>!products.some(p=>p.id===id))||cats.some(id=>!categories.some(c=>c.id===id)))issues.push('Produit ou catégorie introuvable.');
    if(rule.type==='fixed')for(const p of products.filter(p=>ids.includes(p.id)||cats.includes(p.categoryId)))try{if(value>cents(p.price))issues.push('La remise dépasse un prix de base.');}catch{issues.push('Prix de base invalide.');}
    return [...new Set(issues)];
}
export function previewDiscount(product,rules,now=Date.now()){
    const base=cents(product.price);let result={baseCents:base,priceCents:base,ruleId:null};
    for(const r of [...rules].sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
        if(promotionState(r,now)!=='active'||!(r.productIds||[]).includes(product.id)&&!(r.categoryIds||[]).includes(product.categoryId))continue;
        const value=cents(r.value);if(!value||!['percentage','fixed'].includes(r.type)||r.type==='percentage'&&value>10000||r.type==='fixed'&&value>base)continue;
        const price=Math.max(0,base-(r.type==='fixed'?value:Math.round(base*value/10000)));
        if(price<result.priceCents)result={baseCents:base,priceCents:price,ruleId:r.id};
    }return result;
}
export function assignmentIssue(actor,order,target,expected){
    if(!actor||actor.disabled===true||actor.isActive===false||['disabled','inactive'].includes(actor.status)||!['admin','manager'].includes(actor.role))return 'permission';
    if(!order||order.status!=='en_livraison'||order.type!=='livraison'||(order.deliveryGuyId||null)!==(expected||null))return 'conflict';
    if(target&&(target.disabled===true||target.isActive===false||['disabled','inactive'].includes(target.status)||!['livreur','delivery'].includes(target.role)))return 'driver';return null;
}
export const safeURL=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
export function settingsIssues(p){
    const issues=[];if(!String(p.restaurantName||'').trim())issues.push('Nom du restaurant requis.');
    if(!validZone(p.reportingTimezone))issues.push('Fuseau invalide.');
    for(const key of ['phone','whatsappNumber'])if(p[key]&&!/^\+?[0-9 ()-]{6,24}$/.test(p[key]))issues.push('Téléphone invalide.');
    if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))issues.push('E-mail invalide.');
    for(const key of ['logoUrl','websiteUrl','instagramUrl','facebookUrl'])if(p[key]&&!safeURL(p[key]))issues.push('Les liens doivent utiliser HTTPS.');
    if(p.orderingModes){const values=['livraison','emporter','sur_place'].filter(key=>Object.hasOwn(p.orderingModes,key)).map(key=>p.orderingModes[key]);if(values.some(v=>typeof v!=='boolean')||!values.some(Boolean))issues.push('Activez au moins un mode valide.');}
    if(p.openingHours&&(!Array.isArray(p.openingHours)||p.openingHours.length!==7||p.openingHours.some(d=>!d||typeof d.closed!=='boolean'||!d.closed&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.end)||d.start===d.end))))issues.push('Horaires invalides.');
    return [...new Set(issues)];
}
export function orderingAvailable(config,mode,now=Date.now()){
    if(config.isOpen===false||config.orderingModes?.[mode]===false)return false;
    if(!Array.isArray(config.openingHours)||config.openingHours.length!==7)return true;
    const zone=validZone(config.reportingTimezone)?config.reportingTimezone:'Africa/Casablanca';
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now),get=type=>parts.find(p=>p.type===type).value;
    const day=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(get('weekday')),time=get('hour')+':'+get('minute'),today=config.openingHours[day],previous=config.openingHours[(day+6)%7];
    if(!today||!previous||![today.start,today.end,previous.start,previous.end].every(v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v)))return false;
    return !!(!today.closed&&(today.start<today.end?time>=today.start&&time<today.end:time>=today.start)||!previous.closed&&previous.start>previous.end&&time<previous.end);
}
