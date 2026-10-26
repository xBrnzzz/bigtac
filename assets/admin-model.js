// Pure application policy and reporting; UI checks do not replace Firestore Rules.
export const DEFAULT_TIMEZONE = 'Africa/Casablanca';
export const HISTORY_LIMIT = 1000;
export const ACTIVE_LIMIT = 200;
export const roleViews = Object.freeze({
    admin: ['overview', 'orders', 'menu', 'promotions', 'drivers', 'settings'],
    manager: ['overview', 'orders', 'menu', 'promotions', 'settings'],
    caissier: ['orders'], livreur: ['driver']
});
export function profileRole(profile) {
    if (!profile || profile.disabled === true || profile.isActive === false || ['disabled', 'inactive'].includes(profile.status)) return null;
    const value = typeof profile.role === 'string' ? profile.role.trim().toLowerCase() : '';
    const role = value === 'delivery' ? 'livreur' : value;
    return Object.hasOwn(roleViews, role) ? role : null;
}
export function mayView(role, view) { return roleViews[role]?.includes(view) === true; }
export function reportingTimezone(value) {
    try { if (typeof value === 'string' && value.trim()) { new Intl.DateTimeFormat('fr-MA', { timeZone: value }).format(); return value; } } catch { /* Invalid configuration uses the documented default. */ }
    return DEFAULT_TIMEZONE;
}
export function timestampDate(value) {
    const date = value?.toDate ? value.toDate() : value?.seconds != null ? new Date(value.seconds * 1000) : value instanceof Date ? value : null;
    return date && Number.isFinite(date.getTime()) ? date : null;
}
export function dateKey(value, timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
    return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
}
export function shiftDay(key, count) { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); }
export function dayStart(key, timezone) {
    // Find the first instant belonging to this civil day, including DST transitions.
    const anchor = Date.parse(`${key}T00:00:00Z`);
    let low = anchor - 36 * 3600000, high = anchor + 36 * 3600000;
    while (high - low > 1) { const middle = Math.floor((high + low) / 2); if (dateKey(new Date(middle), timezone) < key) low = middle; else high = middle; }
    return new Date(high);
}
export function reportingWindow(now, timezone) {
    const today = dateKey(now, timezone);
    return { today, start: dayStart(shiftDay(today, -6), timezone), end: dayStart(shiftDay(today, 1), timezone) };
}
export function summarizeOrders(orders, activeOrders, now, timezone) {
    const todayKey = dateKey(now, timezone);
    const today = orders.filter(order => { const date = timestampDate(order.createdAt); return date && dateKey(date, timezone) === todayKey; });
    const recorded = today.filter(order => order.status !== 'rejected');
    const validTotal = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0;
    const invalidTotals = recorded.filter(order => !validTotal(order.total)).length;
    const recordedValue = invalidTotals ? null : recorded.reduce((sum, order) => sum + Math.round(Number(order.total) * 100), 0) / 100;
    const hours = Array(24).fill(0), services = { livraison: 0, emporter: 0, sur_place: 0, other: 0 };
    const days = Array.from({ length: 7 }, (_, i) => ({ key: shiftDay(todayKey, i - 6), count: 0 }));
    const productMap = new Map();
    let invalidQuantities = 0;
    for (const order of orders) { const date = timestampDate(order.createdAt); if (!date) continue; const day = days.find(day => day.key === dateKey(date, timezone)); if (day) day.count++; }
    for (const order of today) {
        const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(timestampDate(order.createdAt)));
        hours[hour]++; services[Object.hasOwn(services, order.type) ? order.type : 'other']++;
    }
    for (const order of recorded) {
        if (!Array.isArray(order.items) || !order.items.length) { invalidQuantities++; continue; }
        for (const item of order.items) {
        const quantity = Number(item.qty);
        if (!Number.isInteger(quantity) || quantity < 1) { invalidQuantities++; continue; }
        const name = typeof item.name === 'string' && item.name.trim() ? item.name : 'Produit sans nom';
        const key = item.id || name;
        const entry = productMap.get(key) || { name, quantity: 0 };
        entry.quantity += quantity; productMap.set(key, entry);
        }
    }
    return { count: today.length, completed: today.filter(order => order.status === 'delivered').length, pending: today.filter(order => order.status === 'pending').length,
        recordedValue, average: recordedValue === null || !recorded.length ? null : recordedValue / recorded.length,
        invalidTotals, invalidQuantities, collectedRevenue: null, hours, services, days,
        activeDeliveries: activeOrders.filter(order => order.status === 'en_livraison' && order.type === 'livraison').length,
        awaiting: activeOrders.filter(order => order.status === 'pending'), preparing: activeOrders.filter(order => order.status === 'confirmed'),
        unassigned: activeOrders.filter(order => order.status === 'en_livraison' && order.type === 'livraison' && !order.deliveryGuyId),
        topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 4) };
}
