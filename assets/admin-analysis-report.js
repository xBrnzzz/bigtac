import { analyzeOrders } from './admin-analysis.js';
import { i18n, t } from './i18n.js';
import { icon } from './admin-icons.js';

const tr = (key, values) => t('analysis.' + key, '', values);
const label = key => `<span data-i18n="analysis.${key}">${tr(key)}</span>`;
const option = key => `<option value="${key}" data-i18n="analysis.${key}">${tr(key)}</option>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createAnalysisReport(root, onFilter, onRefresh) {
    root.setAttribute('aria-labelledby', 'analysis-title');
    root.innerHTML = `
        <header class="report-header">
            <div><h3 id="analysis-title">${label('title')}</h3><p id="analysis-range"></p></div>
            <div class="report-controls">
                <label>${label('period')}<select id="analysis-period">${['week','today','yesterday','month'].map(option).join('')}</select></label>
                <label hidden id="analysis-month-field">${label('month')}<input id="analysis-month" type="month"></label>
                <label>${label('service')}<select id="analysis-service">${['all','livraison','emporter','sur_place','other'].map(option).join('')}</select></label>
                <button type="button" class="admin-icon-button" data-i18n-aria="analysis.refresh" aria-label="${tr('refresh')}" id="analysis-refresh">${icon('refresh')}</button>
            </div>
        </header>
        <dl class="report-kpis">
            ${['count','value','average','rejections'].map(key=>`<div><dt>${label(key)}</dt><dd id="analysis-${key}">—</dd>${key==='rejections'?'<small id="analysis-denominator"></small>':''}</div>`).join('')}
        </dl>
        <p class="report-source">${label('scope')} · ${label('grossNote')}</p>
        <p id="analysis-message" role="status" hidden></p>
        <div id="analysis-detail">
            <section class="report-panel report-demand" aria-labelledby="analysis-demand">
                <header><h4 id="analysis-demand">${label('demand')}</h4><p id="analysis-chart-caption"></p></header>
                <div class="report-demand-body">
                    <div class="report-chart-scroll" role="region" aria-labelledby="analysis-chart-caption" tabindex="0"><ol id="analysis-chart" aria-labelledby="analysis-chart-caption"></ol></div>
                    <section id="analysis-peaks" aria-labelledby="analysis-peak-title"><h5 id="analysis-peak-title">${label('peaks')}</h5><ol></ol><p>${label('slotsNote')}</p></section>
                </div>
            </section>
            <div class="report-comparison">
                <section class="report-panel"><header><h4>${label('services')}</h4></header><div id="analysis-services"></div></section>
                <section class="report-panel"><header><h4>${label('products')}</h4><p>${label('productsNote')}</p></header><div id="analysis-products"></div></section>
            </div>
        </div>`;
    const node = key => root.querySelector('#analysis-' + key);
    if (new URLSearchParams(location.search).get('period') === 'month') node('period').value = 'month';
    function selectedMonth(today) {
        const monthly = node('period').value === 'month';
        node('month-field').hidden = !monthly;
        if (!monthly) return '';
        const input = node('month');
        input.max = today.slice(0,7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.value) || input.value > input.max) input.value = input.max;
        return input.value;
    }
    node('refresh').onclick = onRefresh;
    root.querySelector('.report-controls').onchange = onFilter;

    function clear() {
        for (const key of ['count','value','average','rejections']) node(key).textContent = '—';
        for (const key of ['range','denominator','message','services','products','chart']) node(key).replaceChildren();
        node('peaks').querySelector('ol').replaceChildren();
        node('detail').hidden = true;
    }
    function render(orders, now, timezone, {loading, cached}) {
        clear();
        root.setAttribute('aria-busy', String(loading));
        const message = node('message');
        message.hidden = false;
        if (!orders) {
            message.textContent = tr(loading ? 'loading' : 'unavailable');
            return;
        }
        const period = node('period').value;
        const month = node('month').value;
        const model = analyzeOrders(orders, now, timezone, period, node('service').value, month);
        const locale = i18n.getLang() + '-MA';
        const number = new Intl.NumberFormat(locale);
        const currency = new Intl.NumberFormat(locale, {style:'currency',currency:'MAD',currencyDisplay:'code',minimumFractionDigits:2});
        const percent = new Intl.NumberFormat(locale, {style:'percent',maximumFractionDigits:1});
        const money = value => value === null ? '—' : currency.format(value).replace(/[\u00a0\u202f](?=MAD)/, ' ');
        const date = (key, options) => new Intl.DateTimeFormat(locale,{timeZone:'UTC',...options}).format(new Date(key+'T12:00:00Z'));
        const dayLabel = day => date(day.key,{day:'numeric',month:'short'});
        const monthly = period === 'month';
        const daily = monthly || period === 'week';
        const range = daily ? dayLabel(model.days[0]) + ' – ' + dayLabel(model.days.at(-1)) : dayLabel(model.days[0]);
        const includesToday = period !== 'yesterday' && (!monthly || month === node('month').max);
        node('range').textContent = [range,timezone,includesToday && tr('partialDay')].filter(Boolean).join(' · ');
        node('count').textContent = number.format(model.count);
        node('value').textContent = money(model.recordedValue);
        node('average').textContent = money(model.average);
        node('rejections').textContent = model.count ? percent.format(model.rejected/model.count) : '—';
        node('denominator').textContent = tr('rejectedOf',{rejected:number.format(model.rejected),count:number.format(model.count)});
        const notes = [cached && tr('cached'), model.invalidTotals && tr('badTotals'), !model.count && tr('empty')].filter(Boolean);
        message.textContent = notes.join(' ');
        message.hidden = !notes.length;
        if (!model.count) return;
        node('detail').hidden = false;

        const slots = model.hours.map((count,hour) => ({label:number.format(hour)+' h', count}));
        const buckets = daily ? model.days.map(day=>({
            label:monthly ? number.format(Number(day.key.slice(-2))) : date(day.key,{weekday:'short'}),
            full:date(day.key,{weekday:'short',day:'numeric',month:'short'}), count:day.count
        })) : slots;
        const highest = Math.max(...buckets.map(bucket=>bucket.count));
        node('chart-caption').textContent = tr(daily?'byDay':'byHour');
        node('chart').classList.toggle('report-many-bars', monthly || !daily);
        node('chart').innerHTML = buckets.map(bucket => `<li title="${escape(bucket.full || bucket.label)}">
            <div class="report-bar-track"><span class="report-bar" style="height:${86*bucket.count/highest}%" data-peak="${bucket.count===highest}"><b>${number.format(bucket.count)}</b></span></div>
            <span class="report-bucket">${escape(bucket.label)}</span></li>`).join('');
        node('peaks').hidden = !daily;
        if (daily) {
            node('peak-title').textContent = tr(monthly?'peakDates':'peaks');
            node('peaks').querySelector('p').textContent = tr(monthly?'dateRankNote':'slotsNote');
            const busiest = (monthly ? buckets : slots).filter(bucket=>bucket.count).sort((a,b)=>b.count-a.count).slice(0,3);
            node('peaks').querySelector('ol').innerHTML = busiest.map(bucket=>`<li><bdi>${escape(bucket.full || bucket.label)}</bdi><strong>${number.format(bucket.count)} · ${percent.format(bucket.count/model.count)}</strong></li>`).join('');
        }
        const channels = model.services.filter(row=>row.count).sort((a,b)=>b.count-a.count);
        node('services').innerHTML = `<table><caption class="sr-only">${tr('services')}</caption>
            <thead><tr>${['service','volume','refused','average'].map(key=>`<th scope="col">${tr(key)}</th>`).join('')}</tr></thead>
            <tbody>${channels.map(row=>`<tr><th scope="row">${tr(row.key)}</th><td>${number.format(row.count)}</td><td>${number.format(row.rejected)} <small>(${percent.format(row.rejected/row.count)})</small></td><td>${money(row.average)}</td></tr>`).join('')}</tbody></table>`;
        const productList = node('products');
        if (model.invalidQuantities || !model.totalUnits) {
            productList.textContent = tr(model.invalidQuantities ? 'badProducts' : 'noProducts');
            return;
        }
        productList.innerHTML = `<ol>${model.products.slice(0,5).map(product=>{
            const share = product.quantity / model.totalUnits;
            return `<li><div><strong>${escape(product.name)}</strong><span>${number.format(product.quantity)} · ${percent.format(share)}</span></div>
                <div class="unit-track" aria-hidden="true"><i style="width:${100*share}%"></i></div></li>`;
        }).join('')}</ol><small>${tr('totalUnits',{count:number.format(model.totalUnits)})}</small>`;
    }
    return {render, clear, selectedMonth};
}
