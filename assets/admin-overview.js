import { db, collection, query, where, orderBy, onSnapshot } from '../firebase-config.js';
import { limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ACTIVE_LIMIT, HISTORY_LIMIT, reportingTimezone, reportingWindow, summarizeOrders, timestampDate } from './admin-model.js';
import './admin-charts.js';
import { icon } from './admin-icons.js';

const money = value => value == null ? '—' : new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(value).replace(/[\u00a0\u202f]/g, ' ');
const integer = value => new Intl.NumberFormat('fr-MA').format(value);
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function createOverview(container, navigate) {
    const page = document.createElement('section'); page.id = 'view-overview'; page.className = 'admin-page hidden';
    page.innerHTML = `<div class="admin-page-heading"><div><h2>Le service, en un coup d’œil</h2><p id="overview-finding">Chargement des commandes…</p></div><a href="#orders" data-view="orders" class="admin-button primary">Voir les commandes ${icon('arrow')}</a></div>
        <div class="admin-freshness"><span id="overview-window"></span><span id="overview-freshness" role="status">Chargement…</span><button id="overview-refresh" class="admin-button">${icon('refresh')}Actualiser</button></div>
        <div id="overview-notice" class="admin-notice" role="status" hidden></div>
        <dl class="admin-kpis" aria-label="Commandes créées aujourd’hui">
        ${[['orders','Commandes aujourd’hui','Toutes, refusées incluses','shopping-bag'],['completed','Terminées','Créées aujourd’hui · livrées','check'],['pending','En attente','Créées aujourd’hui','clock'],['value','Valeur enregistrée','Hors refusées · non encaissée','wallet']].map(([key,label,note,glyph])=>`<div class="admin-kpi" data-metric="${key}"><dt>${icon(glyph)}${label}</dt><dd id="overview-${key}">—</dd><small>${note}</small></div>`).join('')}</dl>
        <div class="admin-overview-grid">
            <section class="admin-panel"><div class="admin-panel-head"><h3>${icon('chart')}Commandes par heure</h3><small>Aujourd’hui</small></div><div id="overview-hourly" class="admin-chart"></div><p id="overview-hourly-note" class="admin-subtle">Heure locale · refusées incluses</p></section>
            <section class="admin-panel" data-panel="attention"><div class="admin-panel-head"><h3>${icon('bell')}À traiter maintenant</h3><small>Toutes dates</small></div><div id="overview-attention"></div><p id="overview-delay" class="admin-subtle"></p></section>
            <section class="admin-panel"><div class="admin-panel-head"><h3>${icon('chart')}Les 7 derniers jours</h3><small>Commandes créées</small></div><div id="overview-trend" class="admin-chart"></div><p class="admin-subtle">Jour en cours inclus · refusées incluses</p></section>
            <section class="admin-panel"><div class="admin-panel-head"><h3>${icon('truck')}Types de service</h3><small>Aujourd’hui</small></div><dl id="overview-services" class="admin-breakdown"></dl><hr class="admin-rule"><dl class="admin-breakdown"><dt>Panier moyen enregistré</dt><dd id="overview-average">—</dd><dt>Encaissement confirmé</dt><dd>Indisponible</dd></dl><p class="admin-subtle">Aucun registre de paiement vérifié. Une commande livrée ne prouve pas son encaissement.</p></section>
            <section class="admin-panel" data-panel="products"><div class="admin-panel-head"><h3>${icon('grid')}Produits les plus commandés</h3><small>Aujourd’hui</small></div><div id="overview-products"></div><p class="admin-subtle">Quantités enregistrées · hors commandes refusées</p></section>
            <section class="admin-panel" data-panel="actions"><div class="admin-panel-head"><h3>${icon('sliders')}Actions du restaurant</h3></div><p id="overview-store" class="admin-subtle">Statut du restaurant indisponible</p><div class="admin-quick-actions"><button class="admin-button" id="overview-add-product">${icon('plus')}Ajouter un produit</button><a href="#menu" data-view="menu" class="admin-button">${icon('grid')}Gérer la carte</a><button class="admin-button" id="overview-add-promo">${icon('tag')}Créer une promotion</button><a href="#settings" data-view="settings" class="admin-button">${icon('sliders')}Disponibilité du restaurant</a><a href="index.html" target="_blank" rel="noopener" class="admin-button">${icon('external-link')}Voir le site client</a></div><p class="admin-subtle">Pour masquer un produit, ouvrez sa fiche dans la carte. Les alertes de stock ne sont pas encore disponibles.</p></section>
        </div>`;
    container.prepend(page);
    let config = {}, timezone = reportingTimezone(), orders = null, active = null, error = '', lastGood = null, cached = false;
    let historyCached=false, activeCached=false;
    let subscriptions = [], timer = null, currentWindow = null, enabled = false;
    const node = id => document.getElementById(`overview-${id}`);
    const set = (id, value) => { node(id).textContent = value; };
    page.querySelector('#overview-add-product').onclick = async () => { if (await navigate('menu')) window.openItemEditor(); };
    page.querySelector('#overview-add-promo').onclick = async () => { if (await navigate('promotions')) window.openPromoEditor(); };
    node('refresh').onclick = () => { if (enabled) subscribe(); };
    function render() {
        const now = new Date();
        const window = reportingWindow(now, timezone);
        set('window', `${new Intl.DateTimeFormat('fr-MA', { timeZone: timezone, dateStyle: 'full' }).format(now)} · ${timezone}`);
        const historyPartial = orders?.length > HISTORY_LIMIT, activePartial = active?.length > ACTIVE_LIMIT;
        const loading = !error && (orders === null || active === null);
        const readyHistory = !error && orders !== null && !historyPartial;
        const readyActive = !error && active !== null && !activePartial;
        const summary = summarizeOrders(readyHistory ? orders : [], readyActive ? active : [], now, timezone);
        const notices = [];
        if (error) notices.push(error + (lastGood ? ` Dernière réception : ${new Intl.DateTimeFormat('fr-MA', { timeZone: timezone, timeStyle: 'short' }).format(lastGood)}.` : '') + ' Utilisez Actualiser pour réessayer.');
        if (cached) notices.push('Données en cache : elles peuvent être anciennes. Reconnectez-vous pour les actualiser.');
        if (historyPartial) notices.push(`Plus de ${HISTORY_LIMIT} commandes sur 7 jours : indicateurs incomplets masqués. Une agrégation serveur est nécessaire.`);
        if (activePartial) notices.push(`Plus de ${ACTIVE_LIMIT} commandes actives : file et totaux actifs masqués. Consultez Commandes.`);
        if (config.reportingTimezone && config.reportingTimezone !== timezone) notices.push('Fuseau configuré invalide : Africa/Casablanca utilisé.');
        if (summary.invalidTotals) notices.push(`${summary.invalidTotals} montant(s) invalide(s) : valeur et panier moyen indisponibles.`);
        if (summary.invalidQuantities) notices.push('Certaines quantités ne sont pas valides : classement produit indisponible.');
        node('notice').hidden = !notices.length; set('notice', notices.join(' '));
        set('freshness', error ? 'Actualisation échouée' : loading ? 'Chargement…' : cached ? 'Mode cache' : `Reçu à ${new Intl.DateTimeFormat('fr-MA', { timeZone: timezone, timeStyle: 'short' }).format(lastGood || now)}`);
        page.setAttribute('aria-busy', String(loading));
        set('orders', readyHistory ? integer(summary.count) : '—'); set('completed', readyHistory ? integer(summary.completed) : '—');
        set('pending', readyHistory ? integer(summary.pending) : '—'); set('value', readyHistory ? money(summary.recordedValue) : '—');
        set('average', readyHistory ? money(summary.average) : '—');
        set('finding', readyActive ? summary.awaiting.length ? `${integer(summary.awaiting.length)} commande(s) attendent votre acceptation.` : 'Aucune commande en attente d’acceptation.' : loading ? 'Chargement des commandes…' : 'Les indicateurs ne sont pas disponibles.');
        if (readyHistory) {
            const countTicks = value => Number.isInteger(value) ? integer(value) : '';
            windowCharts().bars(node('hourly'), { labels: summary.hours.map((_, i) => `${String(i).padStart(2,'0')}:00`), values: summary.hours, colour: 'var(--admin-accent)', tickFormat: countTicks, integerTicks:true, height: 155 });
            windowCharts().bars(node('trend'), { labels: summary.days.map(day => new Intl.DateTimeFormat('fr-MA', { day:'2-digit', month:'2-digit', timeZone:'UTC' }).format(new Date(`${day.key}T12:00:00Z`))), values: summary.days.map(day => day.count), colour: 'var(--admin-blue)', tickFormat: countTicks, integerTicks:true, height: 155 });
            node('hourly').querySelector('svg').setAttribute('aria-label', `Commandes par heure aujourd’hui : ${summary.hours.map((count, hour)=>`${hour} h : ${count}`).join(', ')}`);
            node('trend').querySelector('svg').setAttribute('aria-label', `Commandes sur 7 jours : ${summary.days.map(day=>`${day.key} : ${day.count}`).join(', ')}`);
            node('services').innerHTML = Object.entries({ livraison:'Livraison', emporter:'À emporter', sur_place:'Sur place', other:'Autre / non renseigné' }).map(([key,label])=>`<dt class="admin-service-name" data-service="${key}">${icon(key==='livraison'?'truck':key==='emporter'?'package':'grid')}${label}</dt><dd>${integer(summary.services[key])}</dd>`).join('');
            node('products').innerHTML = summary.invalidQuantities ? '<p class="admin-empty">Quantités incomplètes. Vérifiez les lignes de commande.</p>' : summary.topProducts.length ? summary.topProducts.map(product=>`<div class="admin-product-row"><span>${escape(product.name)}</span><strong>${integer(product.quantity)} unité(s)</strong></div>`).join('') : `<p class="admin-empty">${icon('shopping-bag')}Aucun produit commandé aujourd’hui.</p>`;
        } else {
            for (const id of ['hourly','trend','services','products']) { node(id)._chartResize?.disconnect(); node(id).innerHTML = `<p class="admin-empty">${loading ? 'Chargement…' : 'Données indisponibles. Actualisez pour réessayer.'}</p>`; }
        }
        node('attention').innerHTML = readyActive ? [
            [summary.awaiting.length,'À accepter','pending'], [summary.preparing.length,'En préparation','confirmed'], [summary.unassigned.length,'Livraisons sans livreur','delivery']
        ].map(([count,label,column])=>`<a class="admin-attention-row" href="#orders" data-column="${column}">${icon(column==='pending'?'clock':column==='confirmed'?'chef':'truck')}<strong>${integer(count)}</strong><span>${label}</span><b>Voir ${icon('arrow')}</b></a>`).join('') + `<div class="admin-product-row"><span>Livraisons actives</span><strong>${integer(summary.activeDeliveries)}</strong></div>` : `<p class="admin-empty">${loading ? 'Chargement de la file…' : 'File indisponible. Ouvrez les commandes ou réessayez.'}</p>`;
        const prepMinutes = Number(config.preparationTimeMinutes);
        if (readyActive && Number.isFinite(prepMinutes) && prepMinutes > 0) {
            const late = summary.preparing.filter(order => { const since = timestampDate(order.confirmedAt); return since && now - since > prepMinutes * 60000; }).length;
            const known = summary.preparing.filter(order=>timestampDate(order.confirmedAt)).length;
            set('delay', `Préparation au-delà de ${prepMinutes} min : ${late} sur ${known} commande(s) horodatée(s). ${summary.preparing.length-known} sans heure de confirmation.`);
        } else set('delay', 'Retards de préparation : seuil ou horodatage fiable non configuré.');
        set('store', config._unavailable ? 'Statut du restaurant indisponible.' : `Restaurant ${config.isOpen === false ? 'fermé' : 'ouvert'} · ${config.whatsappMode === true ? 'Commandes WhatsApp' : 'Commandes sur le site'}`);
        if (currentWindow && window.today !== currentWindow.today) subscribe();
    }
    function windowCharts() { return globalThis.Charts; }
    page.addEventListener('click', event=> { const link = event.target.closest('[data-column]'); if (!link) return; event.preventDefault(); navigate('orders'); window.showOrderCol(link.dataset.column); });
    function unsubscribe() { subscriptions.forEach(fn=>fn()); subscriptions=[]; }
    function subscribe() {
        unsubscribe(); orders = active = null; error=''; cached=historyCached=activeCached=false; currentWindow = reportingWindow(new Date(), timezone); render();
        const receiveError = () => { error='Impossible de charger les commandes.'; orders=active=null; render(); };
        subscriptions.push(onSnapshot(query(collection(db,'orders'), where('createdAt','>=',currentWindow.start), where('createdAt','<',currentWindow.end), orderBy('createdAt','desc'),limit(HISTORY_LIMIT+1)), {includeMetadataChanges:true}, snap=>{
            orders=snap.docs.map(doc=>({ ...doc.data(), id:doc.id })); historyCached=snap.metadata?.fromCache===true; cached=historyCached||activeCached; lastGood=new Date(); render();
        },receiveError));
        subscriptions.push(onSnapshot(query(collection(db,'orders'),where('status','in',['pending','confirmed','en_livraison']),limit(ACTIVE_LIMIT+1)),{includeMetadataChanges:true},snap=>{
            active=snap.docs.map(doc=>({ ...doc.data(), id:doc.id })); activeCached=snap.metadata?.fromCache===true; cached=historyCached||activeCached; lastGood=new Date(); render();
        },receiveError));
    }
    return {
        start(settings) { config=settings; timezone=reportingTimezone(config.reportingTimezone); enabled=true; subscribe(); clearInterval(timer); timer=setInterval(render,60000); },
        update(settings) { const next=reportingTimezone(settings.reportingTimezone); config=settings; if (enabled && next!==timezone) { timezone=next; subscribe(); } else if (enabled) render(); },
        stop() { enabled=false; unsubscribe(); clearInterval(timer); timer=null; orders=active=null; for (const id of ['hourly','trend']) node(id)._chartResize?.disconnect(); },
        visible() { if (enabled) render(); }
    };
}
