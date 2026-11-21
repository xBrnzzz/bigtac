import { dateKey, shiftDay, timestampDate } from './admin-model.js';

const serviceKeys = ['livraison', 'emporter', 'sur_place', 'other'];

function recordedNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim()) return Number(value);
    return NaN;
}

// All time buckets are restaurant-local civil dates/hours, including clock changes.
export function monthDates(month, today) {
    const first = month + '-01';
    const next = shiftDay(first, 32).slice(0,7) + '-01';
    const last = month === today.slice(0,7) ? today : shiftDay(next,-1);
    return {first, last};
}

export function analyzeOrders(orders, now, timezone, period = 'week', service = 'all', month = '') {
    const today = dateKey(now, timezone);
    const range = period === 'month' ? monthDates(month || today.slice(0,7), today) : null;
    const lastDay = range?.last ?? (period === 'yesterday' ? shiftDay(today, -1) : today);
    const dayCount = range ? Number(lastDay.slice(-2)) : period === 'week' ? 7 : 1;
    const days = Array.from({length:dayCount}, (_, i) => ({
        key:shiftDay(lastDay, i + 1 - dayCount), count:0
    }));
    const byDay = new Map(days.map(day => [day.key, day]));
    const hours = Array(24).fill(0);
    const localClock = new Intl.DateTimeFormat('en-GB', {
        timeZone:timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'
    });
    const byService = new Map(serviceKeys.filter(key => service === 'all' || key === service)
        .map(key => [key, {key, count:0, rejected:0, cents:0, invalidTotals:0}]));
    const byProduct = new Map();
    let invalidQuantities = 0;
    let totalUnits = 0;

    for (const order of orders) {
        const channel = byService.get(serviceKeys.includes(order?.type) ? order.type : 'other');
        if (!channel) continue;
        const created = timestampDate(order?.createdAt);
        if (!created || created > now) continue;
        const parts = Object.fromEntries(localClock.formatToParts(created).map(part => [part.type, part.value]));
        const day = byDay.get(`${parts.year}-${parts.month}-${parts.day}`);
        if (!day) continue;
        day.count++;
        hours[Number(parts.hour)]++;
        channel.count++;

        if (order.status === 'rejected') {
            channel.rejected++;
            continue;
        }
        const amount = recordedNumber(order.total);
        const cents = Math.round(amount * 100);
        if (amount >= 0 && Number.isSafeInteger(cents) && Number.isSafeInteger(channel.cents + cents)) {
            channel.cents += cents;
        } else {
            channel.invalidTotals++;
        }
        if (!Array.isArray(order.items) || !order.items.length) {
            invalidQuantities++;
            continue;
        }
        for (const item of order.items) {
            const quantity = recordedNumber(item?.qty);
            if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(totalUnits + quantity)) {
                invalidQuantities++;
                continue;
            }
            // Checkout snapshots often contain only a name. Keep that fallback apart from ID keys.
            const savedName = typeof item.name === 'string' ? item.name.trim() : '';
            const name = savedName || 'Produit sans nom';
            const hasId = typeof item.id === 'string' ? item.id.trim().length > 0 : Number.isSafeInteger(item.id);
            const key = hasId ? 'id:' + item.id : 'name:' + name;
            const entry = byProduct.get(key) || {name, quantity:0, latest:0};
            if (+created >= entry.latest) {
                entry.name = name;
                entry.latest = +created;
            }
            entry.quantity += quantity;
            totalUnits += quantity;
            byProduct.set(key, entry);
        }
    }

    let count = 0, rejected = 0, totalCents = 0, invalidTotals = 0;
    const services = [];
    for (const channel of byService.values()) {
        count += channel.count;
        rejected += channel.rejected;
        totalCents += channel.cents;
        invalidTotals += channel.invalidTotals;
        const recordedValue = channel.invalidTotals ? null : channel.cents / 100;
        const eligible = channel.count - channel.rejected;
        services.push({key:channel.key, count:channel.count, rejected:channel.rejected, recordedValue,
            average:eligible && recordedValue !== null ? recordedValue / eligible : null});
    }
    if (!Number.isSafeInteger(totalCents)) invalidTotals++;
    const recordedValue = invalidTotals ? null : totalCents / 100;
    const eligible = count - rejected;
    const products = invalidQuantities ? [] : [...byProduct.values()]
        .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'fr'))
        .map(({name, quantity}) => ({name, quantity}));
    return {days, hours, count, rejected, recordedValue,
        average:eligible && recordedValue !== null ? recordedValue / eligible : null,
        services, products, totalUnits:invalidQuantities ? null : totalUnits, invalidQuantities, invalidTotals};
}
