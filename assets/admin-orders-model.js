import { profileRole, timestampDate, dateKey } from './admin-model.js';

export const ACTIVE_STATUSES = ['pending', 'confirmed', 'en_livraison'];
export const HISTORY_STATUSES = ['delivered', 'rejected', 'ready'];
export const ORDER_LIMIT = 200;
export const HISTORY_PAGE = 30;
export const ORDER_COLUMNS = [
    { id:'pending', label:'En attente', hint:'À accepter', tone:'waiting' },
    { id:'confirmed', label:'En cuisine', hint:'En préparation', tone:'cooking' },
    { id:'delivery', label:'Prêt / livraison', hint:'Retrait ou remise au livreur', tone:'handoff' },
    { id:'history', label:'Terminées', hint:'Historique récent', tone:'finished' }
];
export const textValue = (value, fallback='') => typeof value==='string' || typeof value==='number' && Number.isFinite(value) ? String(value) : fallback;
export const escapeText = value => textValue(value).replace(/[&<>"']/g, character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
export function orderNumber(order) { return textValue(order.shortId) || textValue(order.id).slice(0,8) || 'Sans numéro'; }
export function serviceName(type) { return ({livraison:'Livraison',emporter:'À emporter',sur_place:'Sur place'})[type] || 'Service non renseigné'; }
export function orderColumn(status) { return status==='pending' || status==='confirmed' ? status : status==='en_livraison' ? 'delivery' : 'history'; }
export function statusName(order) {
    if(order.status==='en_livraison') return order.type==='livraison' ? (order.deliveryGuyId ? 'En livraison' : 'Prêt · attend un livreur') : 'Prêt à remettre';
    return ({pending:'En attente',confirmed:'En cuisine',delivered:'Terminée',rejected:'Refusée',ready:'Prête · ancien statut'})[order.status] || 'Statut non reconnu';
}
export function nextOrderAction(order) {
    return order.status==='pending' ? {status:'confirmed',label:'Accepter en cuisine'} : order.status==='confirmed' ? {status:'en_livraison',label:'Marquer prête'} : order.status==='en_livraison' ? {status:'delivered',label:order.type==='livraison' ? 'Marquer livrée' : 'Confirmer la remise'} : null;
}
export function transitionIssue(profile, order, next, expected) {
    if(!['admin','manager','caissier'].includes(profileRole(profile))) return 'permission';
    if(!order) return 'missing';
    if(order.status!==expected) return 'conflict';
    const transitions={pending:['confirmed','rejected'],confirmed:['en_livraison'],en_livraison:['delivered']};
    return transitions[order.status]?.includes(next) ? null : 'transition';
}
export function orderAmount(value) {
    if((typeof value!=='number' && typeof value!=='string') || value==='') return 'Non renseigné';
    const number=Number(value);
    return Number.isFinite(number) && number>=0 ? new Intl.NumberFormat('fr-MA',{style:'currency',currency:'MAD',minimumFractionDigits:2}).format(number).replace(/[\u00a0\u202f]/g,' ') : 'Non renseigné';
}
export function recordedItems(order) {
    return (Array.isArray(order.items) ? order.items : []).filter(item=>item && typeof item==='object').map(item=>({
        name:textValue(item.name,'Produit sans nom'), qty:Number.isInteger(Number(item.qty)) && Number(item.qty)>0 ? String(Number(item.qty)) : '?',
        price:item.price, note:textValue(item.note),
        options:[...(Array.isArray(item.options)?item.options:[]),...(Array.isArray(item.selectedOptions)?item.selectedOptions:[])].map(option=>textValue(option?.name ?? option)).filter(Boolean),
        supplements:(Array.isArray(item.supplements)?item.supplements:[]).map(option=>textValue(option?.name ?? option)).filter(Boolean)
    }));
}
export function customerNotes(order) { return [...new Set([textValue(order.customer?.note),textValue(order.note)].filter(Boolean))]; }
export function orderAge(order, now=Date.now(), threshold=20) {
    const date=timestampDate(order.createdAt);
    if(!date || date.getTime()>now+60000) return {minutes:null,label:'Heure non vérifiée',tone:'unknown'};
    const minutes=Math.max(0,Math.floor((now-date.getTime())/60000));
    const label=minutes<1 ? 'À l’instant' : minutes<60 ? `${minutes} min` : `${Math.floor(minutes/60)} h ${minutes%60} min`;
    const active=ACTIVE_STATUSES.includes(order.status);
    return {minutes,label,tone:active && threshold>0 ? minutes>=threshold ? 'late' : minutes>=threshold*.75 ? 'soon' : 'recent' : 'recent'};
}
export function filterOrders(orders, {search='',service='all',status='all',date='',kitchen=false}={}, timezone='Africa/Casablanca') {
    const needle=search.trim().replace(/^#/,'').toLocaleLowerCase('fr');
    return orders.filter(order=>{
        if(needle && !orderNumber(order).toLocaleLowerCase('fr').includes(needle)) return false;
        if(service!=='all' && order.type!==service) return false;
        if(kitchen && order.status!=='confirmed') return false;
        if(status!=='all' && (status==='history' ? !HISTORY_STATUSES.includes(order.status) : order.status!==status)) return false;
        if(date) { const created=timestampDate(order.createdAt); if(!created || dateKey(created,timezone)!==date) return false; }
        return true;
    });
}
export function timelineEntries(order) {
    return [['createdAt','Reçue'],['confirmedAt','Acceptée en cuisine'],['readyAt','Prête'],['claimedAt','Prise par le livreur'],['deliveredAt','Livrée / remise'],['updatedAt','Dernière modification']]
        .filter(([field])=>timestampDate(order[field])).map(([field,label])=>({label,date:timestampDate(order[field])}));
}
// A first server snapshot is a baseline, not a burst of new orders.
export class IncomingOrderTracker {
    constructor(startedAt=Date.now()) { this.startedAt=Math.floor(startedAt/1000)*1000; this.initialized=false; this.seen=new Set(); }
    receive(orders,{cached=false,partial=false,pending=false}={}) {
        if(cached || pending) return [];
        const incoming=[];
        for(const order of orders) {
            const created=timestampDate(order.createdAt);
            if(this.initialized && !partial && !this.seen.has(order.id) && order.status==='pending' && created && created.getTime()>=this.startedAt) incoming.push(order.id);
            this.seen.add(order.id);
        }
        this.initialized=true;
        // Once the live queue is truncated, future backfills must not sound like new orders.
        if(partial) this.startedAt=Date.now();
        return incoming;
    }
}
