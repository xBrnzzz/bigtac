import { db, collection, query, where, orderBy, onSnapshot } from '../firebase-config.js';
import { limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ACTIVE_LIMIT, HISTORY_LIMIT, dateKey, dayStart, shiftDay, reportingTimezone, reportingWindow, summarizeOrders, timestampDate } from './admin-model.js';
import { monthDates } from './admin-analysis.js';
import './admin-charts.js';
import { createAnalysisReport } from './admin-analysis-report.js';
import {orderNumber,recordedItems,orderAmount,serviceName,statusName} from './admin-orders-model.js';
import { t, i18n } from './i18n.js';
import { icon } from './admin-icons.js';

const money = value => value == null ? '—' : new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(value).replace(/[\u00a0\u202f]/g, ' ');
const integer = value => new Intl.NumberFormat('fr-MA').format(value);
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function createOverview(container, navigate, openOrder) {
    const page = document.createElement('section'); page.id = 'view-overview'; page.className = 'admin-page hidden';
    page.innerHTML = `<header class="admin-page-heading shift-heading"><div><h2 data-i18n="admin.overview">Vue d’ensemble</h2><p id="overview-window"></p></div><a href="#orders" data-view="orders" class="admin-button primary"><span data-i18n="admin.open_orders">Voir les commandes</span> ${icon('arrow')}</a></header>
        <div class="overview-modes" role="group" aria-label="Vues du tableau de bord" data-i18n-aria="analysis.reports">
            <button type="button" id="overview-live-button" aria-controls="overview-live" aria-pressed="true">${icon('clock')}<span data-i18n="admin.shift">Service en cours</span></button>
            <button type="button" id="overview-analysis-button" aria-controls="overview-analysis" aria-pressed="false">${icon('chart')}<span data-i18n="analysis.tab">Analyse</span></button>
        </div>
        <div id="overview-notice" class="admin-notice" role="status" hidden></div>
        <div id="overview-live">
        <section class="admin-panel service-strip" data-panel="attention" aria-labelledby="service-strip-title">
            <div class="service-strip-heading"><h3 id="service-strip-title" data-i18n="admin.shift">Service en cours</h3><p id="overview-finding" class="sr-only"></p><span id="overview-freshness" role="status"></span></div>
            <div id="overview-attention"></div><div id="overview-next-order"></div>
        </section>
        <dl class="admin-kpis" aria-label="Commandes créées aujourd’hui">
        ${[['orders','Commandes aujourd’hui','Toutes, refusées incluses','shopping-bag'],['completed','Terminées','Créées aujourd’hui · livrées','check'],['pending','En attente','Créées aujourd’hui','clock'],['value','Valeur enregistrée','Hors refusées · non encaissée','wallet']].map(([key,label,note,glyph])=>`<div class="admin-kpi" data-metric="${key}"><dt><span class="admin-metric-icon">${icon(glyph)}</span><span>${label}</span></dt><dd id="overview-${key}">—</dd><small>${note}</small></div>`).join('')}</dl>
        <div class="admin-overview-grid">
            <section class="admin-panel" data-panel="hourly"><div class="admin-panel-head"><h3>${icon('chart')}Commandes par heure</h3><button id="overview-refresh" class="admin-button">${icon('refresh')}Actualiser</button></div><div id="overview-hourly" class="admin-chart"></div><p id="overview-hourly-note" class="admin-subtle">Heure locale · refusées incluses</p></section>

            <section class="admin-panel" data-panel="recent"><div class="admin-panel-head"><h3>${icon('shopping-bag')}Commandes récentes</h3><a href="#orders" data-view="orders" class="admin-panel-link">Voir toutes ${icon('arrow')}</a></div><div id="overview-recent"></div><p class="admin-subtle">Les 4 dernières commandes reçues sur la période de 7 jours.</p></section>
            <section class="admin-panel" data-panel="actions"><div class="admin-panel-head"><h3>${icon('sliders')}Actions rapides</h3><small id="overview-store">Statut du restaurant indisponible</small></div><div class="admin-quick-actions"><button class="admin-button" id="overview-add-product">${icon('plus')}<span class="admin-action-label">Ajouter un produit</span></button><a href="#menu" data-view="menu" class="admin-button">${icon('grid')}<span class="admin-action-label">Gérer la carte</span></a><button class="admin-button" id="overview-add-promo">${icon('tag')}<span class="admin-action-label">Créer une promotion</span></button><a href="#settings" data-view="settings" class="admin-button">${icon('sliders')}<span class="admin-action-label">Disponibilité du restaurant</span></a></div><p id="overview-delay" class="admin-subtle"></p></section>
        </div></div><section id="overview-analysis" hidden></section>`;
    container.prepend(page);
    let config = {}, timezone = reportingTimezone(), orders = null, active = null, historyError = '', activeError = '', lastGood = null, cached = false;
    let historyCached=false, activeCached=false;
    let subscriptions = [], timer = null, currentWindow = null, enabled = false;
    const node = id => document.getElementById(`overview-${id}`);
    const set = (id, value) => { node(id).textContent = value; };
    page.querySelector('#overview-add-product').onclick = async () => { if (await navigate('menu')) window.openItemEditor(); };
    page.querySelector('#overview-add-promo').onclick = async () => { if (await navigate('promotions')) window.openPromoEditor(); };
    node('refresh').onclick = () => { if (enabled) subscribe(); };
    const report = createAnalysisReport(node('analysis'), render, () => { if (enabled) subscribe(); });
    function showAnalysis(show) {
        page.querySelector('.shift-heading').hidden = show;
        node('live').hidden = show;
        node('analysis').hidden = !show;
        node('analysis-button').setAttribute('aria-pressed', String(show));
        node('live-button').setAttribute('aria-pressed', String(!show));
        if (enabled) render();
    }
    node('live-button').onclick = () => showAnalysis(false);
    node('analysis-button').onclick = () => showAnalysis(true);
    showAnalysis(new URLSearchParams(location.search).get('rapport') === 'analyse');
    function render() {
        const focused = page.contains(document.activeElement) ? document.activeElement.closest('a[data-column], a[data-ticket]') : null;
        const focusKey = focused && (focused.hasAttribute('data-ticket') ? 'data-ticket' : 'data-column');
        const now = new Date();
        const today = dateKey(now, timezone);
        const analyzing = !node('analysis').hidden;
        const month = analyzing ? report.selectedMonth(today) : '';
        if (enabled && currentWindow && (today !== currentWindow.today || month !== currentWindow.month)) {
            subscribe();
            return;
        }
        const error = historyError || (!analyzing && activeError);
        set('window', `${new Intl.DateTimeFormat(i18n.getLang() + '-MA', { timeZone: timezone, dateStyle: 'full' }).format(now)} · ${timezone}`);
        const historyPartial = orders?.length > currentWindow?.limit, activePartial = active?.length > ACTIVE_LIMIT;
        const loading = !error && (orders === null || (!analyzing && active === null));
        const readyHistory = !historyError && orders !== null && !historyPartial;
        const readyActive = !activeError && active !== null && !activePartial;
        const notices = [];
        if (error) notices.push(error + (lastGood ? ` Dernière réception : ${new Intl.DateTimeFormat('fr-MA', { timeZone: timezone, timeStyle: 'short' }).format(lastGood)}.` : '') + ' Utilisez Actualiser pour réessayer.');
        if (cached && !analyzing) notices.push('Données en cache : elles peuvent être anciennes. Reconnectez-vous pour les actualiser.');
        if (historyPartial) notices.push(t('analysis.limit','',{count:currentWindow.limit}));
        if (activePartial && node('analysis').hidden) notices.push(`Plus de ${ACTIVE_LIMIT} commandes actives : file et totaux actifs masqués. Consultez Commandes.`);
        if (config.reportingTimezone && config.reportingTimezone !== timezone) notices.push('Fuseau configuré invalide : Africa/Casablanca utilisé.');
        page.setAttribute('aria-busy', String(loading));
        if (analyzing) {
            node('notice').hidden = !notices.length; set('notice', notices.join(' '));
            report.render(readyHistory ? orders : null, now, timezone, {loading, cached: historyCached});
            return;
        }
        const summary = summarizeOrders(readyHistory ? orders : [], readyActive ? active : [], now, timezone);
        if (summary.invalidTotals) notices.push(`${summary.invalidTotals} montant(s) invalide(s) : valeur indisponible.`);
        node('notice').hidden = !notices.length; set('notice', notices.join(' '));
        set('freshness', error ? 'Actualisation échouée' : loading ? 'Chargement…' : cached ? 'Mode cache' : `Reçu à ${new Intl.DateTimeFormat('fr-MA', { timeZone: timezone, timeStyle: 'short' }).format(lastGood || now)}`);
        set('orders', readyHistory ? integer(summary.count) : '—'); set('completed', readyHistory ? integer(summary.completed) : '—');
        set('pending', readyHistory ? integer(summary.pending) : '—'); set('value', readyHistory ? money(summary.recordedValue) : '—');
        set('finding', readyActive ? summary.awaiting.length ? `${integer(summary.awaiting.length)} commande(s) attendent votre acceptation.` : 'Aucune commande en attente d’acceptation.' : loading ? 'Chargement des commandes…' : 'Les indicateurs ne sont pas disponibles.');
        if (readyHistory) {
            const countTicks = value => Number.isInteger(value) ? integer(value) : '';
            if(summary.count>0)windowCharts().bars(node('hourly'), { labels:summary.hours.map((_,i)=>`${i} h`),values:summary.hours,highlight:summary.hours.indexOf(Math.max(...summary.hours)),colour:'var(--admin-accent)',mutedColour:'#d89b7d',integerTicks:true,tickFormat:countTicks,height:180 });
            page.dataset.emptyActivity=String(summary.count===0);
            if(summary.count===0){node('hourly')._chartResize?.disconnect();node('hourly').innerHTML=`<div class="admin-activity-empty">${icon('shopping-bag')}<div><strong>Aucune commande aujourd’hui</strong><p>L’activité horaire apparaîtra dès la première commande reçue.</p></div></div>`;}
            node('hourly').querySelector('svg[role=img]')?.setAttribute('aria-label', `Commandes par heure aujourd’hui : ${summary.hours.map((count, hour)=>`${hour} h : ${count}`).join(', ')}`);
            const recent=[...orders].sort((a,b)=>(timestampDate(b.createdAt)?.getTime()||0)-(timestampDate(a.createdAt)?.getTime()||0)).slice(0,4);
            node('recent').innerHTML=recent.length?`<table class="admin-recent-table"><caption class="sr-only">Commandes récentes, montants enregistrés non encaissés</caption><thead><tr><th>Commande</th><th>Articles</th><th>Heure</th><th>Statut</th><th>Total</th></tr></thead><tbody>${recent.map(order=>`<tr><td><a href="#orders" data-ticket="${escape(order.id)}">#${escape(orderNumber(order))}</a><small>${escape(serviceName(order.type))}</small></td><td>${recordedItems(order).map(item=>`${escape(item.qty)}× ${escape(item.name)}`).join(' · ')||'Détail indisponible'}</td><td>${escape(new Intl.DateTimeFormat('fr-MA',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(timestampDate(order.createdAt)))}</td><td><span class="admin-recent-status" data-state="${escape(order.status)}">${escape(statusName(order))}</span></td><td>${escape(orderAmount(order.total))}</td></tr>`).join('')}</tbody></table>`:`<p class="admin-empty">${icon('shopping-bag')}Aucune commande reçue sur cette période.</p>`;
        } else {
            for (const id of ['hourly','recent']) { node(id)._chartResize?.disconnect(); node(id).innerHTML = `<p class="admin-empty">${loading ? 'Chargement…' : 'Données indisponibles. Actualisez pour réessayer.'}</p>`; }
        }
        node('attention').innerHTML = readyActive ? [
            [summary.awaiting.length,'À accepter','pending'], [summary.preparing.length,'En préparation','confirmed'], [summary.unassigned.length,'Livraisons sans livreur','delivery']
        ].map(([count,label,column])=>`<a class="admin-attention-row" href="#orders" data-column="${column}">${icon(column==='pending'?'clock':column==='confirmed'?'chef':'truck')}<strong>${integer(count)}</strong><span>${t('admin.queue_' + column, label)}</span><b aria-hidden="true">Voir ${icon('arrow')}</b></a>`).join('') + `<div class="admin-attention-total">${icon('truck')}<strong>${integer(summary.activeDeliveries)}</strong><span>${t('admin.active_deliveries')}</span></div>` : `<p class="admin-empty">${loading ? 'Chargement de la file…' : 'File indisponible. Ouvrez les commandes ou réessayez.'}</p>`;
        const nextOrder=readyActive?[...summary.awaiting].sort((a,b)=>(timestampDate(a.createdAt)?.getTime()||Infinity)-(timestampDate(b.createdAt)?.getTime()||Infinity))[0]:null;
        node('next-order').innerHTML=nextOrder?`<a class="admin-next-order" href="#orders" data-ticket="${escape(nextOrder.id)}"><span><small>${t('admin.next_order')}</small><strong>#${escape(orderNumber(nextOrder))} · ${escape(orderAmount(nextOrder.total))}</strong><span class="next-order-items">${recordedItems(nextOrder).slice(0,2).map(item=>`${escape(item.qty)}× ${escape(item.name)}`).join(' · ')}</span></span>${icon('arrow')}</a>`:'';
        const prepMinutes = Number(config.preparationTimeMinutes);
        if (readyActive && Number.isFinite(prepMinutes) && prepMinutes > 0) {
            const late = summary.preparing.filter(order => { const since = timestampDate(order.confirmedAt); return since && now - since > prepMinutes * 60000; }).length;
            const known = summary.preparing.filter(order=>timestampDate(order.confirmedAt)).length;
            set('delay', `Préparation au-delà de ${prepMinutes} min : ${late} sur ${known} commande(s) horodatée(s). ${summary.preparing.length-known} sans heure de confirmation.`);
        } else set('delay', 'Retards de préparation : seuil ou horodatage fiable non configuré.');
        set('store', config._unavailable ? 'Statut du restaurant indisponible.' : `Restaurant ${config.isOpen === false ? 'fermé' : 'ouvert'} · ${config.whatsappMode === true ? 'Commandes WhatsApp' : 'Commandes sur le site'}`);
        if (focused && !focused.isConnected) {
            const candidates = [...page.querySelectorAll('a[' + focusKey + ']')];
            const replacement = candidates.find(link => link.className === focused.className && link.getAttribute(focusKey) === focused.getAttribute(focusKey));
            (replacement || page.querySelector('.shift-heading a')).focus({ preventScroll:true });
        }
    }
    window.addEventListener('bigtac:langchange', () => { if (enabled) render(); });
    function windowCharts() { return globalThis.Charts; }
    page.addEventListener('click', async event => {
        const link = event.target.closest('[data-column], [data-ticket]');
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (!await navigate('orders')) return;
        if (link.dataset.ticket) openOrder(link.dataset.ticket);
        else window.showOrderCol(link.dataset.column);
    });
    function unsubscribe() { subscriptions.forEach(fn=>fn()); subscriptions=[]; }
    function subscribe() {
        unsubscribe(); orders = active = null; historyError=activeError=''; cached=historyCached=activeCached=false;
        const range = reportingWindow(new Date(), timezone);
        range.month = node('analysis').hidden ? '' : report.selectedMonth(range.today);
        range.limit = HISTORY_LIMIT;
        if (range.month) {
            const {first,last} = monthDates(range.month, range.today);
            range.start = dayStart(first, timezone);
            range.end = dayStart(shiftDay(last,1), timezone);
            range.limit = HISTORY_LIMIT * 5;
        }
        currentWindow = range;
        render();
        subscriptions.push(onSnapshot(query(collection(db,'orders'), where('createdAt','>=',range.start), where('createdAt','<',range.end), orderBy('createdAt','desc'),limit(range.limit+1)), {includeMetadataChanges:true}, snap=>{
            if (!enabled || currentWindow !== range) return;
            orders=snap.docs.map(doc=>({ ...doc.data(), id:doc.id })); historyCached=snap.metadata?.fromCache===true; cached=historyCached||activeCached; lastGood=new Date(); render();
        },() => { if (enabled && currentWindow === range) { historyError='Impossible de charger les commandes.'; orders=null; render(); } }));
        subscriptions.push(onSnapshot(query(collection(db,'orders'),where('status','in',['pending','confirmed','en_livraison']),limit(ACTIVE_LIMIT+1)),{includeMetadataChanges:true},snap=>{
            if (!enabled || currentWindow !== range) return;
            active=snap.docs.map(doc=>({ ...doc.data(), id:doc.id })); activeCached=snap.metadata?.fromCache===true; cached=historyCached||activeCached; lastGood=new Date(); render();
        },() => { if (enabled && currentWindow === range) { activeError='Impossible de charger les commandes actives.'; active=null; render(); } }));
    }
    return {
        start(settings) { config=settings; timezone=reportingTimezone(config.reportingTimezone); enabled=true; subscribe(); clearInterval(timer); timer=setInterval(render,60000); },
        update(settings) { const next=reportingTimezone(settings.reportingTimezone); config=settings; if (enabled && next!==timezone) { timezone=next; subscribe(); } else if (enabled) render(); },
        stop() { enabled=false; unsubscribe(); clearInterval(timer); timer=null; orders=active=null; node('hourly')._chartResize?.disconnect(); report.clear(); },
        visible() { if (enabled) render(); }
    };
}
