// In-memory only. This module never imports Firebase or makes network requests.
export const firebaseConfig = {};
export const auth = {}, db = {};
export const initializeApp = () => ({});
export const getAuth = () => ({});
const parameters = new URLSearchParams(location.search);
const role = parameters.get('role') || 'admin';
let user = parameters.get('signedout') ? null : { uid: 'fixture-staff', email: 'fixture@example.test' };
Object.defineProperty(auth, 'currentUser', { get: () => user });
const timestamp = value => ({ seconds: Math.floor(new Date(value).getTime() / 1000), toDate() { return new Date(this.seconds * 1000); } });
const now = Date.now();
const orders = Array.from({ length: 24 }, (_, i) => ({
    id: `fixture-${i}`, shortId: String(1040 + i),
    createdAt: timestamp(now - i * 2 * 3600000),
    status: ['pending', 'confirmed', 'en_livraison', 'delivered', 'delivered', 'rejected'][i % 6],
    type: i % 6 === 2 ? 'livraison' : ['livraison', 'emporter', 'sur_place'][i % 3], total: 45 + (i % 5) * 15,
    customer: { name: ['Salma', 'Youssef', 'Imane'][i % 3], phone: '0600000000', note: i === 0 ? 'Sans oignon, merci.' : '' },
    location: i % 3 ? 'Sur place' : 'Zone Centre (10 Dh)',
    items: [{ id: 'tacos', name: 'Tacos poulet', qty: 1 + i % 2, options: ['Sauce algérienne'] }],
    deliveryGuyId: i === 8 ? 'fixture-staff' : null
}));
const profile = { id:'fixture-staff', uid: 'fixture-staff', name: 'Équipe démo', email: 'fixture@example.test', role };
const data = {
    modifierGroups: [],
    users: [profile], orders: parameters.has('empty') ? [] : orders,
    categories: [{ id: 'tacos', name: 'Tacos', order: 0 }, { id: 'burgers', name: 'Burgers', order: 1 }],
    menuItems: [{ id: 'tacos', name: 'Tacos poulet', category: 'Tacos', order: 0, price: 45, imageUrl: 'assets/tacos-campaign.jpg', isVisible: true, mandatoryChoices: [], supplements: [] }, { id: 'burger', name: 'Burger maison', category: 'Burgers', order: 1, price: 55, imageUrl: 'assets/tacos-campaign.jpg', isVisible: true }],
    promotions: [{ id: 'duo', name: 'Menu duo', price: 80, imageUrl: 'assets/tacos-campaign.jpg', isVisible: true }],
    settings: [{ id: 'config', isOpen: true, whatsappMode: false, reportingTimezone: 'Africa/Casablanca', restaurantName: 'BIGTAC' }]
};
if(parameters.get('menu')==='rich') {
    data.categories.push({id:'sides',name:'Accompagnements',order:2});
    data.menuItems[0].isPopular=true;
    for(const [index,name] of ['Frites cheddar','Nuggets','Tenders','Oignons croustillants'].entries())data.menuItems.push({id:`side-${index}`,name,description:'Accompagnement de démonstration.',category:'Accompagnements',price:15+index*5,order:index+2,imageUrl:'assets/tacos-campaign.jpg',isAvailable:index!==1,isVisible:index!==3,isPopular:index===0,mandatoryChoices:[],supplements:[{name:'Sauce cheddar',price:4}]});
}
if(parameters.get('orders')==='rich') {
    data.orders=Array.from({length:16},(_,i)=>({
        id:`fixture-${i}`,shortId:String(1040+i),status:['pending','confirmed','en_livraison','delivered'][i%4],
        type:['livraison','sur_place','emporter'][i%3],createdAt:timestamp(now-i*4*60000),total:105,
        tableNumber:i%3===1?'7':undefined,
        customer:{name:['Salma','Youssef','Imane'][i%3],phone:'0600000000',note:i===0?'Sauces à part.\nNe pas ajouter d’oignon.':''},
        location:'Zone Centre (10 Dh)',deliveryGuyId:i===6?'fixture-staff':null,deliveryGuyName:i===6?'Équipe livraison':null,
        items:[{name:'Tacos poulet',qty:2,price:90,options:['Sauce algérienne','Poulet','Taille L']},{name:'Frites',qty:1,price:15,options:['Cheddar']}],
        ...(i%4===3?{deliveredAt:timestamp(now-i*4*60000+60000)}:{})
    }));
}
if (parameters.has('disabled')) profile.disabled = true;
if (parameters.has('missing')) data.users = [];
if (parameters.has('config-missing')) data.settings = [];
const listeners = new Set(), authListeners = new Set();
const writes = [], queries = [];
const clone = row => ({ ...row });
const asMillis = value => value?.seconds != null ? value.seconds * 1000 : value instanceof Date ? value.getTime() : value;
export const collection = (_db, name) => ({ name });
export const doc = (_db, name, id) => ({ name, id });
export const where = (field, op, value) => ({ field, op, value });
export const orderBy = (field, direction = 'asc') => ({ sort: field, direction });
export const limit = count => ({ limit: count });
export const startAfter = cursor => ({ cursor:cursor.id });
export const query = (ref, ...filters) => ({ ...ref, filters });
function snapshot(ref) {
    let rows = [...(data[ref.name] || [])];
    for (const f of ref.filters || []) {
        if (f.field) rows = rows.filter(row => {
            const a = asMillis(row[f.field]), b = asMillis(f.value);
            return f.op === '==' ? a === b : f.op === 'in' ? b.includes(a) : f.op === '>=' ? a >= b : f.op === '<' ? a < b : true;
        });
        if (f.sort) rows.sort((a, b) => (asMillis(a[f.sort]) > asMillis(b[f.sort]) ? 1 : -1) * (f.direction === 'desc' ? -1 : 1));
        if (f.limit) rows = rows.slice(0, f.limit);
        if (f.cursor) { const index=rows.findIndex(row=>(row.id||row.uid)===f.cursor); rows=index<0?[]:rows.slice(index+1); }
    }
    const document = row => ({ id: row?.id || row?.uid || ref.id, ref: { name: ref.name, id: row?.id || row?.uid }, exists: () => !!row, data: () => clone(row), metadata:{fromCache:ref.name==='users' && parameters.has('profile-cache'),hasPendingWrites:ref.name==='users' && parameters.has('profile-pending')} });
    if (ref.id) return document(rows.find(row => (row.id || row.uid) === ref.id));
    const docs = rows.map(document);
    return { docs, empty: !docs.length, size: docs.length, forEach: callback => docs.forEach(callback), metadata: { fromCache: window.__adminFixture?.cached || false, hasPendingWrites: false } };
}
export async function getDoc(ref) {
    if (parameters.has('profile-error') && ref.name === 'users') throw Error('Fixture profile unavailable');
    return snapshot(ref);
}
export async function getDocs(ref) { queries.push(ref); if(window.__adminFixture.failHistory && ref.name==='orders')throw Object.assign(Error('Fixture history unavailable'),{code:'unavailable'}); return snapshot(ref); }
export function onSnapshot(ref, optionsOrNext, nextOrError, errorCallback) {
    const next=typeof optionsOrNext==='function' ? optionsOrNext : nextOrError;
    const error=typeof optionsOrNext==='function' ? nextOrError : errorCallback;
    const listener = { ref, next, error }; listeners.add(listener);
    queries.push(ref);
    queueMicrotask(() => {
        if (!listeners.has(listener)) return;
        if (parameters.has('profile-error') && ref.name === 'users') return error?.(Error('Fixture profile unavailable'));
        if ((parameters.has('orders-error') || window.__adminFixture.failOrders) && ref.name === 'orders') return error?.(Error('Fixture orders unavailable'));
        if (window.__adminFixture.failMenu && ['categories','menuItems'].includes(ref.name)) return error?.(Error('Fixture menu unavailable'));
        next(snapshot(ref));
    });
    return () => listeners.delete(listener);
}
function emit() { for (const listener of [...listeners]) { if (!listeners.has(listener)) continue; if (window.__adminFixture.failOrders && listener.ref.name==='orders') listener.error?.(Error('Fixture orders unavailable')); else if(window.__adminFixture.failMenu&&['menuItems','categories'].includes(listener.ref.name))listener.error?.(Error('Fixture menu unavailable'));else listener.next(snapshot(listener.ref)); } }
export function onAuthStateChanged(_auth, callback) { authListeners.add(callback); queueMicrotask(() => callback(user)); return () => authListeners.delete(callback); }
export async function signInWithEmailAndPassword() { user = { uid: 'fixture-staff', email: 'fixture@example.test' }; for (const cb of authListeners) cb(user); return { user }; }
export async function signOut() { user = null; for (const cb of authListeners) cb(null); }
export const serverTimestamp = () => timestamp(Date.now());
export async function updateDoc(ref, value) {
    if (window.__adminFixture.failWrites) throw Error('Fixture write rejected');
    checkOrderWrite(ref,value);
    writes.push({ kind: 'update', ref, value });
    Object.assign(data[ref.name].find(row => (row.id || row.uid) === ref.id), value); emit();
}
export async function setDoc(ref, value) { writes.push({ kind: 'set', ref, value }); data[ref.name] ||= []; data[ref.name].push({ id: ref.id, ...value }); emit(); }
export async function addDoc(ref, value) { const id = `new-${writes.length}`; await setDoc({ ...ref, id }, value); return { id }; }
export async function deleteDoc(ref) { writes.push({ kind: 'delete', ref }); data[ref.name] = data[ref.name].filter(row => (row.id || row.uid) !== ref.id); emit(); }
export const writeBatch = () => { const tasks = []; return { update: (ref, value) => tasks.push(() => updateDoc(ref, value)), commit: () => Promise.all(tasks.map(fn => fn())) }; };
function checkOrderWrite(ref,value) {
    if(['categories','menuItems','modifierGroups','settings'].includes(ref.name)) {
        const member=data.users.find(row=>(row.id||row.uid)===user?.uid);
        if(!member||!['admin','manager'].includes(member.role)||member.disabled||member.isActive===false)throw Object.assign(Error('Fixture catalog permission denied'),{code:'permission-denied'});
        if(value.price!=null && (!Number.isFinite(Number(value.price))||Number(value.price)<0))throw Object.assign(Error('Fixture invalid price'),{code:'permission-denied'});
    }
    if(ref.name!=='orders')return;
    const membership=data.users.find(row=>(row.id||row.uid)===user?.uid), role=membership?.role==='delivery'?'livreur':membership?.role;
    const before=data.orders.find(row=>row.id===ref.id), after={...before,...value}, keys=Object.keys(value);
    const valid=membership && membership.disabled!==true && membership.isActive!==false && !['disabled','inactive'].includes(membership.status);
    const staff=valid&&['admin','manager','caissier'].includes(role);
    const path={pending:['confirmed','rejected'],confirmed:['en_livraison'],en_livraison:['delivered']};
    const staffStatus=staff&&keys.every(key=>key==='status')&&path[before?.status]?.includes(after.status);
    const driverClaim=valid&&role==='livreur'&&before?.status==='en_livraison'&&before?.type==='livraison'&&!before.deliveryGuyId&&after.deliveryGuyId===user.uid&&keys.every(key=>['deliveryGuyId','deliveryGuyName','claimedAt'].includes(key));
    const driverComplete=valid&&role==='livreur'&&before?.status==='en_livraison'&&before?.type==='livraison'&&before?.deliveryGuyId===user.uid&&after.status==='delivered'&&keys.every(key=>['status','deliveredAt'].includes(key));
    if(!staffStatus&&!driverClaim&&!driverComplete)throw Object.assign(Error('Fixture permission denied'),{code:'permission-denied'});
}
export const runTransaction = async (_db, fn) => {
    window.__adminFixture.transactions++;
    for(let attempt=0;attempt<3;attempt++) {
        const reads=[],tasks=[];
        const result=await fn({ get:async ref=>{const snap=await getDoc(ref);reads.push({ref,version:JSON.stringify(snap.data())});return snap;},update:(ref,value)=>tasks.push({kind:'update',ref,value}),set:(ref,value)=>tasks.push({kind:'set',ref,value}),delete:ref=>tasks.push({kind:'delete',ref,value:{}}) });
        if(window.__adminFixture.writeDelay)await new Promise(resolve=>setTimeout(resolve,window.__adminFixture.writeDelay));
        if(window.__adminFixture.beforeCommit){const callback=window.__adminFixture.beforeCommit;window.__adminFixture.beforeCommit=null;callback();}
        if(reads.some(read=>JSON.stringify(snapshot(read.ref).data())!==read.version))continue;
        if(window.__adminFixture.failWrites)throw Object.assign(Error('Fixture write rejected'),{code:'unavailable'});
        tasks.forEach(({ref,value})=>checkOrderWrite(ref,value));
        tasks.forEach(({kind,ref,value})=>{
            writes.push({kind:'transaction',ref,value});data[ref.name] ||= [];
            const row=data[ref.name].find(row=>(row.id||row.uid)===ref.id);
            if(kind==='delete')data[ref.name]=data[ref.name].filter(row=>(row.id||row.uid)!==ref.id);
            else if(kind==='set'){if(row)Object.assign(row,value);else data[ref.name].push({...value,id:ref.id});}
            else Object.assign(row,value);
        });emit();return result;
    }
    throw Object.assign(Error('Fixture concurrent update'),{code:'aborted'});
};
export const createUserWithEmailAndPassword = async () => ({ user: { uid: 'new-fixture-staff' } });
window.__adminFixture = { data, writes, queries, listeners, transactions:0,writeDelay:0,beforeCommit:null,failHistory:false,failWrites: false, failOrders: false, cached: false, emit, revoke() { data.users = []; emit(); }, setRole(value) { profile.role = value; emit(); } };
