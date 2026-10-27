import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startAdminFixtureServer} from './fixtures/admin-server.mjs';
const {server,url}=await startAdminFixtureServer(),browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(url+'/admin.html?orders=rich');await page.waitForFunction(()=>window.switchView);
 const result=await page.evaluate(async()=>{
  const {operationsService}=await import('/assets/operations-service.js');let checks=0;
  const check=(value,label)=>{if(!value)throw Error(label);checks++;};
  let actor={uid:'fixture-staff',role:'admin',epoch:1};const service=operationsService(()=>actor);
  const deny=async fn=>{try{await fn();return false;}catch{return true;}};
  const fixture=__adminFixture;fixture.data.users.push({id:'d1',role:'livreur',name:'Premier'},{id:'d2',role:'delivery',name:'Second'});
  const row=fixture.data.orders.find(o=>o.id==='fixture-6'),history=JSON.stringify(fixture.data.orders.filter(o=>o.status==='delivered'));
  await service.assign({id:row.id,driverId:'d1',expected:'fixture-staff'});check(row.deliveryGuyId==='d1','assign');
  await service.assign({id:row.id,driverId:'d2',expected:'d1'});check(row.deliveryGuyId==='d2','reassign');
  await service.assign({id:row.id,driverId:'',expected:'d2'});check(row.deliveryGuyId===null,'unassign');
  fixture.beforeCommit=()=>{row.deliveryGuyId='d2';};check(await deny(()=>service.assign({id:row.id,driverId:'d1',expected:null})),'simultaneous assignment conflict');check(row.deliveryGuyId==='d2','concurrent assignment preserved');
  fixture.data.users.find(u=>u.id==='d1').disabled=true;check(await deny(()=>service.assign({id:row.id,driverId:'d1',expected:'d2'})),'inactive driver rejected');
  check(await deny(()=>service.assign({id:'fixture-3',driverId:'d2',expected:null})),'completed rejected');
  fixture.setRole('manager');actor={...actor,role:'manager'};await service.assign({id:row.id,driverId:'',expected:'d2'});check(row.deliveryGuyId===null,'manager existing role accepted');
  fixture.setRole('caissier');actor={...actor,role:'caissier'};check(await deny(()=>service.assign({id:row.id,driverId:'d2',expected:null})),'cashier rejected');
  check(await deny(()=>service.settings({restaurantName:'Forbidden'},{})),'cashier settings rejected');
  fixture.setRole('admin');actor={...actor,role:'admin'};fixture.failWrites=true;check(await deny(()=>service.assign({id:row.id,driverId:'d2',expected:null})),'write failure');check(row.deliveryGuyId===null,'no optimistic mutation');fixture.failWrites=false;
  const config=fixture.data.settings[0];config.orderingModes={livraison:true,emporter:true,sur_place:true,futureMode:'retain'};
  await service.settings({orderingModes:{livraison:false,emporter:true,sur_place:true}},{...config});check(config.orderingModes.futureMode==='retain','unknown nested mode retained');
  config.openingHours=Array.from({length:7},()=>({closed:false,start:'10:00',end:'23:00',futureMetadata:'retain'}));
  await service.settings({openingHours:config.openingHours.map(day=>({closed:day.closed,start:day.start,end:'22:00'}))},{...config});check(config.openingHours.every(day=>day.futureMetadata==='retain'&&day.end==='22:00'),'unknown schedule metadata retained');
  check(await deny(()=>service.settings({deliveryFee:0},{...config})),'price-sensitive setting rejected');
  const expected={...config};config.restaurantName='Other editor';check(await deny(()=>service.settings({restaurantName:'Overwrite'},expected)),'stale settings rejected');
  fixture.data.users[0].disabled=true;check(await deny(()=>service.offer({id:'blocked',patch:{name:'Offer',price:10}})),'revoked actor rejected');
  check(JSON.stringify(fixture.data.orders.filter(o=>o.status==='delivered'))===history,'history untouched');
  return checks;
 });console.log(`${result} transaction/permission fixture checks passed`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
