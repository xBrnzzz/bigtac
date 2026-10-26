import assert from 'node:assert/strict';
import { profileRole, mayView, reportingTimezone, dayStart, dateKey, reportingWindow, summarizeOrders } from '../assets/admin-model.js';

let checks=0;
const equal=(actual,expected,label)=>{ assert.deepEqual(actual,expected,label); checks++; };
equal(profileRole(null),null,'Missing profile fails closed');
equal(profileRole({}),null,'Missing role fails closed');
equal(profileRole({role:'owner'}),null,'Unknown role fails closed');
equal(profileRole({role:'constructor'}),null,'Inherited object properties never become roles');
equal(profileRole({role:'ADMIN',disabled:true}),null,'Disabled staff denied');
equal(profileRole({role:'admin',isActive:false}),null,'Inactive staff denied');
equal(profileRole({role:' delivery '}),'livreur','Driver alias supported');
equal(mayView('caissier','menu'),false,'Cashier cannot edit catalog');
equal(mayView('manager','drivers'),false,'Manager cannot provision staff');
equal(reportingTimezone('invalid/timezone'),'Africa/Casablanca','Invalid timezone defaults');
equal(dayStart('2026-10-26','Africa/Casablanca').toISOString(),'2026-10-25T23:00:00.000Z','Casablanca midnight differs from UTC');
equal(dayStart('2026-02-16','Africa/Casablanca').toISOString(),'2026-02-16T00:00:00.000Z','Ramadan clock transition supported');
equal(dayStart('2026-03-23','Africa/Casablanca').toISOString(),'2026-03-22T23:00:00.000Z','DST resumption supported');
for (const zone of ['Africa/Casablanca','UTC','Asia/Kathmandu','America/New_York']) {
    const start=dayStart('2026-10-26',zone);
    equal(dateKey(start,zone),'2026-10-26',`${zone} first instant`);
    equal(dateKey(new Date(+start-1),zone),'2026-10-25',`${zone} preceding instant`);
}
const now=new Date('2026-10-26T12:00:00Z');
const window=reportingWindow(now,'Africa/Casablanca');
equal(window.start.toISOString(),'2026-10-19T23:00:00.000Z','Seven civil days start');
equal(window.end.toISOString(),'2026-10-26T23:00:00.000Z','Civil tomorrow bounds');
const row=(status,total,createdAt,type='livraison')=>({status,total,createdAt:new Date(createdAt),type,items:[{id:'tacos',name:'Tacos',qty:2}]});
const rows=[row('pending',50,'2026-10-25T23:00:00Z'),row('delivered',100,'2026-10-26T09:00:00Z','emporter'),row('rejected',80,'2026-10-26T10:00:00Z'),row('en_livraison',60,'2026-10-25T22:00:00Z')];
const summary=summarizeOrders(rows,rows,now,'Africa/Casablanca');
equal(summary.count,3,'Counts exact civil day, including rejected');
equal(summary.completed,1,'Completed means delivered among created today');
equal(summary.pending,1,'Pending created today');
equal(summary.recordedValue,150,'Excludes rejected, includes unpaid');
equal(summary.average,75,'Average uses recorded-order population');
equal(summary.collectedRevenue,null,'Delivered is never inferred collected');
equal(summary.activeDeliveries,1,'Active includes previous-day delivery');
equal(summary.unassigned.length,1,'Unassigned active deliveries identified');
equal(summary.topProducts[0].quantity,4,'Product units exclude rejected');
equal(summary.hours.reduce((a,b)=>a+b,0),summary.count,'Hourly count reconciles');
equal(Object.values(summary.services).reduce((a,b)=>a+b,0),summary.count,'Service count reconciles');
for (const total of [undefined,null,'',NaN,Infinity,-10]) {
    const result=summarizeOrders([row('pending',total,'2026-10-26T10:00:00Z')],[],now,'Africa/Casablanca');
    equal(result.recordedValue,null,'Missing/invalid total is unknown, not zero'); equal(result.average,null,'Invalid average remains unknown');
}
equal(summarizeOrders([],[],now,'Africa/Casablanca').recordedValue,0,'Real empty sum is zero');
equal(summarizeOrders([],[],now,'Africa/Casablanca').average,null,'No-order average is undefined');
equal(summarizeOrders([{...rows[0],items:null}],[],now,'Africa/Casablanca').invalidQuantities,1,'Missing order lines are unknown, not zero products');
console.log(`${checks} admin reporting/policy checks passed`);
