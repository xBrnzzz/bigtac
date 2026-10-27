import {db,collection,query,where,getDocs} from '../firebase-config.js';
import {limit} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {operationsService} from './operations-service.js';
import { icon } from './admin-icons.js';
import { reportingTimezone, timestampDate, dateKey, shiftDay } from './admin-model.js';
import { ORDER_COLUMNS, ORDER_LIMIT, HISTORY_PAGE, HISTORY_STATUSES, IncomingOrderTracker, textValue, escapeText as e, orderNumber, serviceName, statusName, nextOrderAction, orderAmount, recordedItems, customerNotes, orderAge, orderColumn, filterOrders, timelineEntries } from './admin-orders-model.js';
import { watchActiveOrders, watchOrder, fetchOrderHistory, commitOrderTransition, operationMessage } from './admin-orders-service.js';

const queueIcon = id => ({pending:'clock',confirmed:'chef',delivery:'package',history:'check'})[id] || 'note';
const serviceIcon = type => type === 'livraison' ? 'truck' : type === 'emporter' ? 'package' : 'grid';

export function createOrderWorkspace(root,{session,settings,toast}) {
    root.className='orders-workspace hidden';
    root.innerHTML=`<header class="orders-heading"><div><h2 id="orders-title">Commandes<span> en direct</span></h2><p>De l’acceptation à la remise au client.</p></div><div class="orders-utilities"><button id="orders-sound" class="admin-button" aria-pressed="false">${icon('sound')}<span>Son désactivé</span></button><button id="orders-refresh" class="admin-button">${icon('refresh')}Actualiser</button></div></header>
        <div class="orders-toolbar"><div class="orders-control-row"><div class="orders-mode" role="group" aria-label="Présentation des commandes"><button id="orders-mode-service" aria-pressed="true">${icon('shopping-bag')}Service</button><button id="orders-mode-kitchen" aria-pressed="false">${icon('chef')}Cuisine</button></div><span id="orders-connection" role="status">Chargement…</span><span id="orders-period" class="orders-period"></span></div>
        <div class="orders-search-row"><label class="orders-search"><span class="sr-only">Rechercher un numéro de commande</span>${icon('search')}<input id="orders-search" type="search" placeholder="Rechercher un numéro…" autocomplete="off" name="order-search"></label><button id="orders-filters-toggle" class="admin-button" aria-expanded="false" aria-controls="orders-filters">${icon('filter')}Filtres</button></div></div>
        <div id="orders-filters" class="orders-filters" hidden><label>Service<select id="orders-service"><option value="all">Tous les services</option><option value="livraison">Livraison</option><option value="emporter">À emporter</option><option value="sur_place">Sur place</option></select></label><label>Statut<select id="orders-status"><option value="all">Tous les statuts</option><option value="pending">En attente</option><option value="confirmed">En cuisine</option><option value="en_livraison">Prêt / livraison</option><option value="history">Terminées</option><option value="delivered">Remises / livrées</option><option value="rejected">Refusées</option><option value="ready">Prêtes (ancien statut)</option></select></label><label>Date de réception<input id="orders-date" type="date" name="order-date"></label><label>Repère local (min)<input id="orders-threshold" type="number" min="0" max="240" step="1" value="0" inputmode="numeric"><small>0 : aucun avertissement. Repère local depuis réception, pas délai de cuisson.</small></label><button id="orders-clear" class="admin-button">Effacer les filtres</button></div>
        <div id="orders-notification" class="orders-notification" role="status" hidden>${icon('bell')}<span></span><button class="admin-button" id="orders-show-new">Voir les nouvelles</button></div>
        <div id="orders-error" class="orders-feedback" role="alert" hidden></div><div id="orders-summary" class="orders-summary" role="status"></div>
        <nav class="orders-tabs" aria-label="Files de commandes">${ORDER_COLUMNS.map(column=>`<button id="mtab-${column.id}" data-tab="${column.id}" data-tone="${column.tone}" aria-pressed="${column.id==='pending'}">${icon(queueIcon(column.id))}${column.label} <span id="count-${column.id}">—</span></button>`).join('')}</nav>
        <div class="orders-board">${ORDER_COLUMNS.map(column=>`<section id="col-${column.id}" class="orders-column" data-column="${column.id}" data-tone="${column.tone}" aria-labelledby="order-heading-${column.id}"><header><div><h3 id="order-heading-${column.id}" tabindex="-1">${icon(queueIcon(column.id))}${column.label}</h3><p>${column.hint}</p></div><span data-count="${column.id}" aria-label="Commandes affichées">—</span></header><div id="list-${column.id}" class="orders-list"></div>${column.id==='history'?'<footer><button id="orders-history-more" class="admin-button">Charger l’historique</button><p id="orders-history-note">7 derniers jours. Chargement à la demande.</p></footer>':''}</section>`).join('')}</div>`;
    const toolbar=root.querySelector('.orders-toolbar');
    toolbar.append(root.querySelector('.orders-utilities'));
    const metadata=document.createElement('div');metadata.className='orders-metadata';
    for(const id of ['orders-connection','orders-period','orders-summary'])metadata.append(root.querySelector('#'+id));
    toolbar.after(metadata);
    root.querySelector('#orders-sound').setAttribute('aria-label','Activer ou désactiver les notifications sonores');
    root.querySelector('#orders-refresh').setAttribute('aria-label','Actualiser les commandes');
    const dialog=document.createElement('dialog'); dialog.id='order-detail'; dialog.className='order-detail'; dialog.setAttribute('aria-labelledby','order-detail-title');
    dialog.innerHTML=`<header><div><p>Détail de commande</p><h2 id="order-detail-title"></h2></div><button id="order-detail-close" class="admin-icon-button" aria-label="Fermer le détail">${icon('x')}</button></header><div id="order-detail-body" class="order-detail-body"></div><footer id="order-detail-actions"></footer>`;
    document.body.append(dialog);
    const receipt=document.createElement('section'); receipt.id='order-print-receipt'; receipt.hidden=true; document.body.append(receipt);
    let active=[],historyOrders=[],historyCursor=null,hasMore=true,historyLoaded=false,historyBusy=false,historyError='',historyRequest=0;
    let stopLive=null,stopDetail=null,timer=null,selected=null,detailError='',detailCached=false;
    let enabled=false,epoch=0,activeError='',loading=true,cached=false,partial=false,kitchen=false,tab='pending',timezone='Africa/Casablanca',newCount=0;
    let filter={search:'',service:'all',status:'all',date:''},threshold=0,tracker=null,audio=null,sound=false;
    let deliveryDrivers=[],driverError='',driverLoaded=false,driverRequest=0,assignmentBusy=false;
    const assignments=operationsService(session);
    const pending=new Map(),failures=new Map(),cards=new Map();
    const $=id=>document.getElementById(id);
    const money=order=>e(orderAmount(order.total));
    const knownOrder=id=>selected?.id===id ? selected : active.find(order=>order.id===id)||historyOrders.find(order=>order.id===id);
    const profile=()=>session();
    function config() { timezone=reportingTimezone(settings()?.reportingTimezone); }
    function clock(date,full=false) { return date ? new Intl.DateTimeFormat('fr-MA',{timeZone:timezone,...(full?{dateStyle:'medium',timeStyle:'short'}:{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}).format(date) : 'Heure non renseignée'; }
    function table(order) { const value=textValue(order.tableNumber ?? order.table); return value ? `Table ${e(value)}` : ''; }
    function canAct() { return enabled && !!profile() && !loading && !cached && !activeError && navigator.onLine; }
    function actionMarkup(order,detail=false) {
        const state=pending.get(order.id),failure=failures.get(order.id),next=nextOrderAction(order),disabled=assignmentBusy || !canAct() || !!state || detail && (detailCached||!!detailError);
        const primary=next?`<button class="admin-button primary" data-transition="${next.status}" ${disabled?'disabled':''}>${icon(next.status==='confirmed'?'chef':next.status==='en_livraison'?'package':'check')}${state ? state.waiting?'Confirmation en attente…':'Enregistrement…' : next.label}</button>`:'';
        return `<div class="order-actions" data-order-id="${e(order.id)}">${primary}${order.status==='pending'?`<button class="admin-button order-reject" data-transition="rejected" ${disabled?'disabled':''}>${icon('x')}Refuser</button>`:''}</div>${failure?`<div class="order-operation-error" role="alert"><p>${e(failure.message)}</p>${next && !['conflict','missing','permission','transition'].includes(failure.code)?`<button class="admin-button" data-retry="${e(order.id)}" ${disabled?'disabled':''}>Réessayer</button>`:''}</div>`:''}`;
    }
    function itemMarkup(order,detail=false) {
        const items=recordedItems(order);
        if(!items.length) return '<p class="orders-muted">Détail des produits non renseigné.</p>';
        return `<ul class="order-products">${items.map(item=>`<li><div class="order-product-title"><strong><span>${e(item.qty)}×</span> ${e(item.name)}</strong>${detail && !kitchen?`<span>${e(orderAmount(item.price))}</span>`:''}</div>${item.options.length?`<p class="order-options"><b>Choix :</b> ${item.options.map(e).join(' · ')}</p>`:''}${item.supplements.length?`<p class="order-options"><b>Suppléments :</b> ${item.supplements.map(e).join(' · ')}</p>`:''}${item.note?`<p class="order-instructions"><b>Instruction produit :</b> ${e(item.note)}</p>`:''}</li>`).join('')}</ul>`;
    }
    function noteMarkup(order) { return customerNotes(order).map(note=>`<div class="order-instructions"><b>${icon('note')}Consigne client</b><p>${e(note)}</p></div>`).join(''); }
    function ageMarkup(order) { const age=orderAge(order,Date.now(),threshold); return `<span class="order-age" data-age-id="${e(order.id)}" data-age-tone="${age.tone}" title="Temps depuis réception">${e(age.label)}${age.tone==='late'?' · repère dépassé':age.tone==='soon'?' · à surveiller':''}</span>`; }
    function cardMarkup(order) {
        return `<div class="order-card-heading"><button class="order-open" data-open="${e(order.id)}" aria-label="Ouvrir la commande ${e(orderNumber(order))}"><strong>#${e(orderNumber(order))}</strong></button><span class="order-service" data-service="${e(order.type)}">${icon(serviceIcon(order.type))}${e(serviceName(order.type))}</span><span class="order-status" data-state="${e(order.status)}">${e(statusName(order))}</span></div><div class="order-ticket-time"><small>Reçue à ${e(clock(timestampDate(order.createdAt)))}</small>${ageMarkup(order)}</div>${table(order)?`<div class="order-meta"><span>${icon('grid')}${table(order)}</span></div>`:''}${itemMarkup(order)}${noteMarkup(order)}${!kitchen?`<div class="order-card-total"><span>Total enregistré</span><strong>${money(order)}</strong></div>`:''}${actionMarkup(order)}<button class="order-detail-link" data-open="${e(order.id)}">${icon('note')}Détails & reçu</button>`;
    }
    function updateTimers() {
        if(!enabled) return;
        root.querySelectorAll('[data-age-id]').forEach(element=>{
            const order=knownOrder(element.dataset.ageId); if(!order) return;
            const age=orderAge(order,Date.now(),threshold); element.dataset.ageTone=age.tone;
            element.textContent=age.label+(age.tone==='late'?' · repère dépassé':age.tone==='soon'?' · à surveiller':'');
        });
        if(selected && dialog.open) { const element=$('order-detail-age'); if(element) element.textContent=orderAge(selected,Date.now(),threshold).label; }
    }
    function render() {
        if(!enabled) return;
        config(); root.dataset.tab=tab; root.dataset.kitchen=String(kitchen);
        $('orders-title').innerHTML=kitchen?'Cuisine':'Commandes<span> en direct</span>';
        $('orders-connection').textContent=!navigator.onLine?'Hors connexion':activeError?'Synchronisation interrompue':loading?'Chargement…':cached?'Données en cache':'Synchronisé en direct';
        $('orders-period').textContent=`${timezone} · ${threshold ? `repère local ${threshold} min` : `sans seuil de délai`}`;
        const problems=[];
        if(activeError) problems.push(activeError);
        if(cached) problems.push('File en cache : les actions attendent la reconnexion et une lecture confirmée.');
        if(partial) problems.push(`${ORDER_LIMIT} commandes actives affichées. La file dépasse cette limite : les compteurs sont partiels. Faites vérifier la capacité de la file.`);
        $('orders-error').dataset.tone=activeError?'error':'attention';
        $('orders-error').hidden=!problems.length; $('orders-error').textContent=problems.join(' ');
        const data=[...active.slice(0,ORDER_LIMIT),...historyOrders.filter(order=>!active.some(current=>current.id===order.id))];
        const filtered=filterOrders(data,{...filter,kitchen},timezone).sort((a,b)=>(timestampDate(a.createdAt)?.getTime()||0)-(timestampDate(b.createdAt)?.getTime()||0));
        $('orders-summary').textContent=loading?'Chargement des files…':`${filtered.length} commande(s) affichée(s)${filter.search?' · recherche dans les commandes chargées':''}${kitchen?' · vue cuisine, coordonnées masquées':''}`;
        $('orders-mode-service').setAttribute('aria-pressed',String(!kitchen)); $('orders-mode-kitchen').setAttribute('aria-pressed',String(kitchen));
        const present=new Set();
        for(const column of ORDER_COLUMNS) {
            const rows=filtered.filter(order=>orderColumn(order.status)===column.id); if(column.id==='history') rows.reverse();
            const list=$(`list-${column.id}`); const count=column.id==='history' && !historyLoaded && !rows.length ? '—' : String(rows.length);
            $(`count-${column.id}`).textContent=count; root.querySelector(`[data-count="${column.id}"]`).textContent=count;
            $(`mtab-${column.id}`).setAttribute('aria-pressed',String(tab===column.id));
            const empty=list.querySelector('.orders-queue-empty'); if(empty) empty.remove();
            rows.forEach((order,index)=>{
                present.add(order.id);
                let card=cards.get(order.id); if(!card) {card=document.createElement('article');card.className='order-card';card.dataset.orderId=order.id;cards.set(order.id,card);}
                const fingerprint=JSON.stringify([order,kitchen,pending.get(order.id),failures.get(order.id),canAct()]);
                if(card._fingerprint!==fingerprint) {
                    const focused=card.contains(document.activeElement),action=document.activeElement?.dataset.transition;
                    card.innerHTML=cardMarkup(order); card._fingerprint=fingerprint;
                    if(focused) (card.querySelector(`[data-transition="${action}"]:not(:disabled)`) || card.querySelector('[data-open]'))?.focus({preventScroll:true});
                }
                if(list.children[index]!==card) list.insertBefore(card,list.children[index]||null);
            });
            if(!rows.length) {
                const empty=document.createElement('p');empty.className='orders-queue-empty';
                empty.textContent=loading && column.id!=='history'?'Chargement…':activeError && column.id!=='history'?'File indisponible. Utilisez Actualiser.':column.id==='history'&&!historyLoaded?'Chargez les commandes terminées à la demande.':filter.search||filter.date||filter.service!=='all'||filter.status!=='all'?'Aucune commande ne correspond aux filtres.':'Aucune commande dans cette file.';
                empty.insertAdjacentHTML('afterbegin',icon(activeError?'alert':loading?'clock':queueIcon(column.id)));list.append(empty);
            }
        }
        for(const [id,card] of cards) if(!present.has(id)) { const focused=card.contains(document.activeElement);card.remove();cards.delete(id);if(focused) $(`order-heading-${tab}`)?.focus({preventScroll:true}); }
        $('orders-history-more').disabled=historyBusy || !navigator.onLine || historyLoaded&&!hasMore&&!historyError;
        $('orders-history-more').textContent=historyBusy?'Chargement…':historyError?'Réessayer l’historique':!historyLoaded?'Charger l’historique':hasMore?'Charger davantage':'Historique chargé';
        $('orders-history-note').textContent=historyError || `${historyOrders.length} chargée(s) · ${filter.date?'date sélectionnée':'7 derniers jours'}${historyLoaded?' · Actualiser pour relire les états.':'.'}`;
        if(selected && dialog.open) renderDetail();
    }
    function renderDetail() {
        if(!selected || !profile()) return;
        const focused=document.activeElement,footerFocused=$('order-detail-actions').contains(focused),focusedTransition=focused?.dataset.transition;
        const order=selected,contact=!kitchen && ['admin','manager'].includes(profile().role);
        $('order-detail-title').textContent=`Commande #${orderNumber(order)}`;
        const milestones=timelineEntries(order);
        $('order-detail-body').innerHTML=`<div class="order-detail-meta"><span>${e(serviceName(order.type))}${table(order)?` · ${table(order)}`:''}</span><strong>${e(statusName(order))}</strong><span>Reçue ${e(clock(timestampDate(order.createdAt),true))}</span><span>Depuis réception : <b id="order-detail-age">${e(orderAge(order,Date.now(),threshold).label)}</b></span></div>${detailError?`<p class="orders-feedback" role="alert">${e(detailError)}</p>`:''}${detailCached?'<p class="orders-feedback">Détail en cache. Les actions sont suspendues.</p>':''}<section><h3>${icon('chef')}À préparer</h3>${itemMarkup(order,true)}${noteMarkup(order)}</section>${!kitchen?`<section><h3>${icon('package')}Remise de commande</h3><p>${e(textValue(order.customer?.name,'Client'))}</p>${contact&&order.customer?.phone?`<p>Téléphone : ${e(textValue(order.customer.phone))}</p>`:''}${contact&&order.type==='livraison'?`<p>Destination : ${e(textValue(order.location,'Non renseignée'))}</p><p>Livreur : ${e(textValue(order.deliveryGuyName,'Non attribué'))}</p>`:''}<dl class="admin-breakdown"><dt>Total enregistré</dt><dd>${money(order)}</dd><dt>Paiement</dt><dd>Non vérifié</dd></dl></section>`:''}<section><h3>${icon('clock')}Historique enregistré</h3><ul class="order-timeline">${milestones.map(entry=>`<li><span>${e(entry.label)}</span><time>${e(clock(entry.date,true))}</time></li>`).join('')}</ul><p class="orders-muted">Seules les heures enregistrées sont affichées. Aucune durée de cuisson ou preuve d’encaissement n’est déduite.</p></section>`;
        if(contact&&order.type==='livraison'&&order.status==='en_livraison'){
            const section=document.createElement('section');section.innerHTML=`<h3>${icon('truck')}Attribution au livreur</h3><p role="status">${e(driverError||(!driverLoaded?'Chargement des livreurs…':'Les attributions précédentes ne constituent pas un historique audité.'))}</p><label for="delivery-assignee">Livreur</label><select id="delivery-assignee" class="admin-button w-full" ${!driverLoaded||assignmentBusy?'disabled':''}><option value="">Sans livreur</option>${deliveryDrivers.map(driver=>`<option value="${e(driver.id)}" ${order.deliveryGuyId===driver.id?'selected':''}>${e(driver.name||'Livreur')}</option>`).join('')}</select><button id="delivery-assign" class="admin-button primary" ${!driverLoaded||assignmentBusy||!canAct()||detailCached||!!detailError?'disabled':''}>${assignmentBusy?'Enregistrement…':'Enregistrer l’attribution'}</button>`;
            $('order-detail-body').append(section);
            section.querySelector('#delivery-assign').onclick=async()=>{
                if(assignmentBusy||!canAct()||detailCached||detailError)return;
                const driverId=section.querySelector('select').value,expected=order.deliveryGuyId||null,version=epoch;
                if((driverId||null)===expected)return;
                assignmentBusy=true;renderDetail();
                try{await assignments.assign({id:order.id,driverId,expected});if(version===epoch)toast('Attribution enregistrée.');}catch(error){if(version===epoch){driverError=error.message;toast(error.message,'error');}}finally{assignmentBusy=false;if(version===epoch&&dialog.open)renderDetail();}
            };
        }
        const address=textValue(order.customer?.address||order.address);
        if(contact&&address){const link=document.createElement('a');link.className='admin-button';link.target='_blank';link.rel='noopener';link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);link.textContent='Ouvrir l’adresse dans Maps';$('order-detail-body').append(link);}
        $('order-detail-actions').innerHTML=`${actionMarkup(order,true)}<button class="admin-button" id="order-print">${icon('printer')}Imprimer ${kitchen?'le bon cuisine':'le reçu'}</button>`;
        if(footerFocused) ($('order-detail-actions').querySelector(`[data-transition="${focusedTransition}"]:not(:disabled)`) || $('order-print')).focus({preventScroll:true});
    }
    function openDetail(id) {
        const order=knownOrder(id);if(!order || !enabled || !profile()) return;
        stopDetail?.(); selected=order; detailError='';detailCached=cached;renderDetail();
        if(!dialog.open) dialog.showModal();
        const version=epoch,request=++driverRequest;deliveryDrivers=[];driverLoaded=false;driverError='';
        if(['admin','manager'].includes(profile().role)&&order.type==='livraison'&&order.status==='en_livraison')getDocs(query(collection(db,'users'),where('role','in',['livreur','delivery']),limit(51))).then(snap=>{
            if(request!==driverRequest||version!==epoch||!dialog.open)return;
            if(snap.metadata?.fromCache||snap.docs.length>50)throw Error('Liste des livreurs non confirmée ou trop longue.');
            deliveryDrivers=snap.docs.map(d=>({...d.data(),id:d.id})).filter(d=>d.disabled!==true&&d.isActive!==false&&!['disabled','inactive'].includes(d.status));driverLoaded=true;renderDetail();
        }).catch(()=>{if(request===driverRequest&&version===epoch&&dialog.open){driverError='Liste indisponible. Vérifiez votre autorisation serveur puis rouvrez ce détail.';renderDetail();}});
        stopDetail=watchOrder(id,(fresh,metadata)=>{
            if(version!==epoch || !enabled) return;
            if(!fresh) {selected=null;dialog.close();toast('Cette commande n’existe plus.','error');return;}
            selected=fresh;detailCached=metadata?.fromCache===true || metadata?.hasPendingWrites===true;detailError='';renderDetail();
        },error=>{if(version===epoch && enabled){detailError=operationMessage(error);renderDetail();}});
    }
    function printSelected() {
        if(!selected || !enabled || !profile()) return;
        const order=selected,name=textValue(settings()?.restaurantName,'BIGTAC');
        receipt.innerHTML=`<h1>${e(name)}</h1><h2>${kitchen?'Bon cuisine':'Reçu de commande'} #${e(orderNumber(order))}</h2><p>${e(serviceName(order.type))} ${table(order)}</p><p>${e(clock(timestampDate(order.createdAt),true))}</p>${itemMarkup(order,true)}${noteMarkup(order)}${!kitchen?`<p>Total enregistré : <strong>${money(order)}</strong></p><p>Paiement non vérifié. Ce document ne confirme pas un encaissement.</p>`:''}`;
        window.print();
    }
    async function changeStatus(id,next,explicitExpected) {
        const order=knownOrder(id);if(!order || !profile()) return false;
        if(pending.has(id)) return false;
        if(!canAct() || dialog.open&&selected?.id===id&&(detailCached||detailError)) {failures.set(id,{code:'offline',message:'Attendez une connexion et une lecture confirmées, puis réessayez.',next,expected:explicitExpected||order.status});render();return false;}
        if(next==='rejected' && !confirm(`Refuser la commande #${orderNumber(order)} ? Cette action est définitive.`)) return false;
        const version=epoch,actor={...profile()},expected=explicitExpected || order.status;
        const operation={next,expected,waiting:false};failures.delete(id);pending.set(id,operation);render();
        const slow=setTimeout(()=>{const operation=pending.get(id);if(operation){operation.waiting=true;render();}},8000);
        try {
            const updated=await commitOrderTransition({id,next,expected,session:actor,currentSession:session});
            if(version!==epoch || !enabled) return true;
            if(selected?.id===id) selected=updated;
            if(HISTORY_STATUSES.includes(next)) {
                const created=timestampDate(updated.createdAt),key=created?dateKey(created,timezone):'',today=dateKey(new Date(),timezone);
                if(key && key>=(filter.date||shiftDay(today,-6)) && key<=(filter.date||today))historyOrders=[updated,...historyOrders.filter(item=>item.id!==id)];
            }
            if(next==='en_livraison') toast(`Commande #${orderNumber(updated)} prête pour ${updated.type==='livraison'?'le livreur':'la remise au client'}.`);
            else toast(`Commande #${orderNumber(updated)} : ${statusName(updated).toLocaleLowerCase('fr')}.`);
            return true;
        } catch(error) {
            if(version!==epoch || !enabled) return false;
            failures.set(id,{code:String(error.code||''),message:operationMessage(error),next,expected});render();return false;
        } finally {clearTimeout(slow);if(pending.get(id)===operation)pending.delete(id);if(version===epoch && enabled)render();}
    }
    async function historyPage(reset=false) {
        if(!enabled || !profile() || historyBusy&&!reset) return;
        if(!navigator.onLine) {historyError='Hors connexion. Reconnectez-vous puis réessayez.';render();return;}
        if(!reset && historyLoaded && !hasMore && !historyError) return;
        const version=epoch,date=filter.date,zone=timezone,request=++historyRequest;
        historyBusy=true;historyError='';if(reset){historyCursor=null;historyOrders=[];historyLoaded=false;hasMore=true;}render();
        try {
            const page=await fetchOrderHistory({date,timezone:zone,cursor:reset?null:historyCursor});
            if(version!==epoch || request!==historyRequest || date!==filter.date || zone!==timezone || !enabled)return;
            const map=new Map((reset?[]:historyOrders).map(order=>[order.id,order]));page.orders.forEach(order=>map.set(order.id,order));
            historyOrders=[...map.values()];historyCursor=page.cursor;hasMore=page.hasMore;historyLoaded=true;
            if(page.cached)historyError='Historique en cache. Reconnectez-vous et actualisez pour vérifier les états.';
        } catch(error){if(version===epoch && request===historyRequest)historyError=operationMessage(error);}
        finally{if(version===epoch && request===historyRequest){historyBusy=false;render();}}
    }
    function setTab(id) {if(!ORDER_COLUMNS.some(column=>column.id===id))return;tab=kitchen?'confirmed':id;if(id==='history'&&!historyLoaded&&!historyBusy)historyPage();render();}
    function subscribe() {
        stopLive?.();loading=true;activeError='';cached=false;render();const version=epoch;
        stopLive=watchActiveOrders(snapshot=>{
            if(version!==epoch||!enabled)return;
            loading=false;activeError='';cached=snapshot.cached||snapshot.pending;partial=snapshot.orders.length>ORDER_LIMIT;active=snapshot.orders;
            const incoming=tracker.receive(active,{cached:snapshot.cached,pending:snapshot.pending,partial});
            if(incoming.length){newCount+=incoming.length;$('orders-notification').hidden=false;$('orders-notification').querySelector('span').textContent=`${newCount} nouvelle(s) commande(s) à accepter`;if(sound)playAlert();}
            render();
        },error=>{if(version===epoch&&enabled){loading=false;activeError=operationMessage(error);active=[];render();}});
    }
    async function playAlert() {
        if(!audio || audio.state!=='running' || !sound)return;
        const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=660;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.08,audio.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.22);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.24);
    }
    $('orders-sound').onclick=async()=>{
        try {if(!sound){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error();audio ||=new Context();await audio.resume();if(audio.state!=='running')throw Error();}sound=!sound;}
        catch{sound=false;toast('Le son n’est pas disponible. Les alertes visuelles restent actives.','error');}
        $('orders-sound').querySelector('span').textContent=sound?'Son activé':'Son désactivé';$('orders-sound').setAttribute('aria-pressed',String(sound));
    };
    $('orders-refresh').onclick=()=>{if(enabled){subscribe();if(historyLoaded||tab==='history')historyPage(true);}};
    $('orders-filters-toggle').onclick=()=>{const open=$('orders-filters').hidden;$('orders-filters').hidden=!open;$('orders-filters-toggle').setAttribute('aria-expanded',String(open));};
    $('orders-search').oninput=event=>{filter.search=event.target.value;render();};
    for(const [id,key]of [['service','service'],['status','status'],['date','date']])$(`orders-${id}`).onchange=event=>{
        filter[key]=event.target.value;
        if(key==='status'&&HISTORY_STATUSES.concat('history').includes(filter.status)){kitchen=false;tab='history';if(!historyLoaded)historyPage();}
        if(key==='status'&&['pending','confirmed','en_livraison'].includes(filter.status)){tab=orderColumn(filter.status);if(filter.status!=='confirmed')kitchen=false;}
        if(key==='date') {
            if(filter.date && filter.date!==dateKey(new Date(),timezone) && filter.status==='all'){kitchen=false;tab='history';}
            if(historyLoaded||historyBusy||tab==='history'){historyOrders=[];historyCursor=null;historyLoaded=false;hasMore=true;historyPage(true);}
        }
        render();
    };
    $('orders-threshold').onchange=event=>{const value=Number(event.target.value);if(!Number.isInteger(value)||value<0||value>240){event.target.setCustomValidity('Choisissez un repère entre 0 et 240 minutes.');event.target.reportValidity();return;}event.target.setCustomValidity('');threshold=value;try{localStorage.setItem(`bigtac.order-age.${profile()?.uid}`,String(value));}catch{}updateTimers();render();};
    $('orders-clear').onclick=()=>{filter={search:'',service:'all',status:'all',date:''};for(const key of ['search','date'])$(`orders-${key}`).value='';for(const key of ['service','status'])$(`orders-${key}`).value='all';if(historyLoaded)historyPage(true);render();};
    $('orders-mode-service').onclick=()=>{kitchen=false;render();};$('orders-mode-kitchen').onclick=()=>{kitchen=true;tab='confirmed';filter.status='all';$('orders-status').value='all';render();};
    $('orders-show-new').onclick=()=>{kitchen=false;filter={search:'',service:'all',status:'all',date:''};$('orders-search').value=$('orders-date').value='';$('orders-service').value=$('orders-status').value='all';newCount=0;$('orders-notification').hidden=true;if(historyLoaded)historyPage(true);setTab('pending');$('list-pending').scrollTop=0;$('order-heading-pending').focus({preventScroll:true});};
    $('orders-history-more').onclick=()=>historyPage();
    $('order-detail-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{driverRequest++;stopDetail?.();stopDetail=null;selected=null;receipt.replaceChildren();});
    const click=event=>{
        if(event.target.closest('#order-print'))return printSelected();
        const button=event.target.closest('[data-tab],[data-open],[data-transition],[data-retry]');
        if(button?.dataset.tab)return setTab(button.dataset.tab);
        if(button?.dataset.open)return openDetail(button.dataset.open);
        if(button?.dataset.transition){const id=button.closest('[data-order-id]')?.dataset.orderId;return changeStatus(id,button.dataset.transition);}
        if(button?.dataset.retry){const failure=failures.get(button.dataset.retry);if(failure)return changeStatus(button.dataset.retry,failure.next,failure.expected);}
        const card=event.target.closest('article[data-order-id]');if(card&&!event.target.closest('button,a,input,select'))openDetail(card.dataset.orderId);
    };
    root.addEventListener('click',click);dialog.addEventListener('click',click);
    window.addEventListener('offline',()=>{if(enabled)render();});window.addEventListener('online',()=>{if(enabled)render();});
    return {
        start(){if(enabled)return;enabled=true;epoch++;config();active=[];historyOrders=[];historyCursor=null;historyLoaded=false;historyBusy=false;historyError='';hasMore=true;failures.clear();newCount=0;$('orders-notification').hidden=true;tracker=new IncomingOrderTracker();threshold=0;try{const saved=Number(localStorage.getItem(`bigtac.order-age.${profile()?.uid}`));if(Number.isInteger(saved)&&saved>=0&&saved<=240)threshold=saved;}catch{}$('orders-threshold').value=threshold;subscribe();timer=setInterval(updateTimers,30000);},
        stop(){enabled=false;epoch++;stopLive?.();stopLive=null;stopDetail?.();stopDetail=null;clearInterval(timer);timer=null;if(dialog.open)dialog.close();active=[];historyOrders=[];cards.forEach(card=>card.remove());cards.clear();pending.clear();failures.clear();receipt.replaceChildren();sound=false;$('orders-sound').querySelector('span').textContent='Son désactivé';$('orders-sound').setAttribute('aria-pressed','false');if(audio){audio.close().catch(()=>{});audio=null;}},
        column:setTab,changeStatus, settingsChanged(){if(enabled){const before=timezone;config();if(before!==timezone&&(historyLoaded||historyBusy))historyPage(true);render();}},
    };
}
