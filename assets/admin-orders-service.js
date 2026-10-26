import { db, collection, doc, query, where, orderBy, onSnapshot, getDocs, runTransaction, serverTimestamp } from '../firebase-config.js';
import { limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ACTIVE_STATUSES, HISTORY_STATUSES, ORDER_LIMIT, HISTORY_PAGE, transitionIssue } from './admin-orders-model.js';
import { profileRole, dayStart, shiftDay, dateKey } from './admin-model.js';

export class OrderOperationError extends Error {
    constructor(code) { super(code); this.code=code; }
}
export function watchActiveOrders(next,error) {
    // One equality/in index, bounded even when the application stays open all day.
    return onSnapshot(query(collection(db,'orders'),where('status','in',ACTIVE_STATUSES),limit(ORDER_LIMIT+1)),{includeMetadataChanges:true},snapshot=>{
        next({orders:snapshot.docs.map(document=>({...document.data(),id:document.id})),cached:snapshot.metadata?.fromCache===true,pending:snapshot.metadata?.hasPendingWrites===true});
    },error);
}
export function watchOrder(id,next,error) {
    return onSnapshot(doc(db,'orders',id),{includeMetadataChanges:true},snapshot=>next(snapshot.exists()?{...snapshot.data(),id:snapshot.id}:null,snapshot.metadata),error);
}
export async function fetchOrderHistory({date='',timezone='Africa/Casablanca',cursor=null}={}) {
    const today=dateKey(new Date(),timezone);
    const first=date || shiftDay(today,-6), last=shiftDay(date || today,1);
    const constraints=[where('status','in',HISTORY_STATUSES),where('createdAt','>=',dayStart(first,timezone)),where('createdAt','<',dayStart(last,timezone)),orderBy('createdAt','desc')];
    if(cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(HISTORY_PAGE+1));
    const snapshot=await getDocs(query(collection(db,'orders'),...constraints));
    const documents=snapshot.docs.slice(0,HISTORY_PAGE);
    return {orders:documents.map(document=>({...document.data(),id:document.id})),cursor:documents.at(-1)||null,hasMore:snapshot.docs.length>HISTORY_PAGE,cached:snapshot.metadata?.fromCache===true};
}
export async function commitOrderTransition({id,next,expected,session,currentSession}) {
    if(!session || !['admin','manager','caissier'].includes(profileRole(session))) throw new OrderOperationError('permission');
    if(globalThis.navigator?.onLine===false) throw new OrderOperationError('offline');
    return runTransaction(db,async transaction=>{
        const profile=await transaction.get(doc(db,'users',session.uid));
        const orderRef=doc(db,'orders',id);
        const document=await transaction.get(orderRef);
        const liveSession=currentSession();
        if(!liveSession || liveSession.uid!==session.uid || liveSession.role!==session.role || liveSession.epoch!==session.epoch) throw new OrderOperationError('permission');
        const issue=transitionIssue(profile.exists()?profile.data():null,document.exists()?document.data():null,next,expected);
        if(issue) throw new OrderOperationError(issue);
        // Same collection, status values and write shape as before. No timestamp/schema migration.
        transaction.update(orderRef,{status:next});
        return {...document.data(),id,status:next};
    });
}
export async function commitDriverAction({id,kind,session,currentSession}) {
    if(profileRole(session)!=='livreur')throw new OrderOperationError('permission');
    if(globalThis.navigator?.onLine===false)throw new OrderOperationError('offline');
    return runTransaction(db,async transaction=>{
        const profile=await transaction.get(doc(db,'users',session.uid));
        const ref=doc(db,'orders',id),snapshot=await transaction.get(ref),live=currentSession();
        if(!profile.exists()||profileRole(profile.data())!=='livreur'||!live||live.uid!==session.uid||live.epoch!==session.epoch||live.role!==session.role)throw new OrderOperationError('permission');
        if(!snapshot.exists())throw new OrderOperationError('missing');
        const order=snapshot.data();
        if(order.status!=='en_livraison'||order.type!=='livraison')throw new OrderOperationError('conflict');
        if(kind==='claim') {
            if(order.deliveryGuyId)throw new OrderOperationError('conflict');
            transaction.update(ref,{deliveryGuyId:session.uid,deliveryGuyName:session.name||'Livreur',claimedAt:serverTimestamp()});
        } else if(kind==='complete') {
            if(order.deliveryGuyId!==session.uid)throw new OrderOperationError('permission');
            transaction.update(ref,{status:'delivered',deliveredAt:serverTimestamp()});
        } else throw new OrderOperationError('transition');
    });
}
export function operationMessage(error) {
    const code=String(error?.code || '');
    if(code==='conflict' || code.includes('aborted')) return 'Cette commande a changé sur un autre appareil. Vérifiez son nouvel état avant de réessayer.';
    if(code==='missing' || code.includes('not-found')) return 'Cette commande n’existe plus. Actualisez la file.';
    if(code==='permission' || code.includes('permission-denied') || code.includes('unauthenticated')) return 'Votre compte ne peut plus effectuer cette action. Vérifiez votre accès avec un administrateur.';
    if(code==='transition') return 'Cette action ne correspond pas à l’état actuel de la commande.';
    if(code==='offline' || code.includes('unavailable')) return 'Connexion indisponible. Reconnectez-vous puis réessayez.';
    if(code.includes('failed-precondition')) return 'La requête ne peut pas aboutir. Demandez la vérification de la configuration des index.';
    return 'La modification n’a pas été confirmée. Vérifiez la commande puis réessayez.';
}
