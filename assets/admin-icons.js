// Small local outline set. One 24px grid and 1.8px stroke throughout the POS;
// no CDN, runtime replacement pass, or additional package needed for these views.
const paths = {
    edit: '<path d="m15 4 5 5M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6 5-2"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="18" width="7" height="3" rx="1"/>',
    'shopping-bag': '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    grid: '<path d="M3 3v5a3 3 0 0 0 6 0V3M6 3v18M20 3c-4 3-4 8 0 9V3Zm0 9v9"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-4M20 13V3M1 10h6M9 12h6M17 17h6"/>',
    'log-out': '<path d="M9 3H4v18h5M10 12h11m-4-4 4 4-4 4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    'external-link': '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    wallet: '<path d="M20 7V4H4a2 2 0 0 0 0 4h17v13H4a2 2 0 0 1-2-2V6M21 12h-6v5h6"/>',
    chart: '<path d="M3 3v18h18M8 17v-5M13 17V7M18 17V4"/>',
    truck: '<path d="M2 4h12v13H2V4Zm12 5h4l4 5v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    chef: '<path d="M6 14a5 5 0 0 1-1-10 4 4 0 0 1 7-1 4 4 0 0 1 7 1 5 5 0 0 1-1 10v7H6v-7Zm0 3h12"/>',
    bell: '<path d="M5 9a7 7 0 0 1 14 0v6l2 3H3l2-3V9ZM10 21h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    filter: '<path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/>',
    note: '<path d="M4 3h16v18H4V3ZM8 8h8M8 12h8M8 16h4"/>',
    printer: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6v-7Z"/>',
    package: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M8 5l9 4"/>',
    alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
    sound: '<path d="M3 9h4l5-5v16l-5-5H3V9ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
    off: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'
};
export function icon(name) {
    return `<svg class="admin-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.note}</svg>`;
}
