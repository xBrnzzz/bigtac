import assert from 'node:assert/strict';

const firestoreHost=process.env.FIRESTORE_EMULATOR_HOST;
if(!firestoreHost) { console.log('SKIP: local Firestore emulator is not configured; Rules remain unverified.'); process.exit(0); }
function localOrigin(host) { const url=new URL(`http://${host}`); assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.port&&!url.username&&!url.password&&url.pathname==='/','Emulator host must be loopback with an explicit port'); return url.origin; }
const firestore=localOrigin(firestoreHost),project='demo-bigtac-orders';
const base=`${firestore}/v1/projects/${project}/databases/(default)/documents`;
let checks=0;
const field=value=>typeof value==='string'?{stringValue:value}:typeof value==='boolean'?{booleanValue:value}:{integerValue:String(value)};
async function patch(document,values,token='owner') {
    return fetch(`${base}/${document}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(values).map(([key,value])=>[key,field(value)]))})});
}
async function actor(role,disabled=false) {
    const uid=`staff-${crypto.randomUUID()}`,iat=Math.floor(Date.now()/1000);
    assert.ok((await patch(`users/${uid}`,{role,disabled})).ok,'Seed emulator membership');
    // Standard emulator-only unsigned JWT shape; never valid for production Auth.
    // Matches the Firebase SDK's createMockUserToken approach without adding dependencies.
    const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({alg:'none',typ:'JWT'})}.${encode({iss:`https://securetoken.google.com/${project}`,aud:project,iat,exp:iat+3600,auth_time:iat,sub:uid,user_id:uid,firebase:{sign_in_provider:'custom',identities:{}}})}.`;
}
async function transition(token,from,to,extra={}) {
    const id=`order-${crypto.randomUUID()}`;
    assert.ok((await patch(`orders/${id}`,{status:from,total:100,type:'emporter'})).ok);
    return patch(`orders/${id}`,{status:to,total:100,type:'emporter',...extra},token);
}
for(const role of ['admin','manager','caissier']) {
    const token=await actor(role);
    for(const [from,to]of [['pending','confirmed'],['pending','rejected'],['confirmed','en_livraison'],['en_livraison','delivered']]) {assert.ok((await transition(token,from,to)).ok,`${role}: permitted transition`);checks++;}
    for(const [from,to]of [['pending','delivered'],['delivered','pending'],['confirmed','ready']]) {assert.equal((await transition(token,from,to)).status,403,'Illegal transition denied');checks++;}
    assert.equal((await transition(token,'pending','confirmed',{total:1})).status,403,'Cannot alter prices with status update');checks++;
}
for(const [role,disabled]of [['livreur',false],['customer',false],['owner',false],['admin',true]]) {assert.equal((await transition(await actor(role,disabled),'pending','confirmed')).status,403,'Unauthorized membership denied');checks++;}
console.log(`${checks} local emulator Rules checks passed for test-only staff policy; no production resources accessed.`);
