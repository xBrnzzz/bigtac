import assert from 'node:assert/strict';
import { profileRole, mayView, reportingTimezone, dayStart, dateKey, reportingWindow, summarizeOrders } from '../assets/admin-model.js';
import { analyzeOrders } from '../assets/admin-analysis.js';

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
const reportTime = new Date('2026-10-26T12:00:00Z');
const zone = 'Africa/Casablanca';
const history = [
    {...rows[0], total:'0.10', items:[{name:'Tacos',qty:'2'}]},
    {...rows[1], total:0.20, items:[{id:'p1',name:'Burger maison',qty:2}]},
    {...rows[2], total:null, items:null},
    {...rows[3], type:'inconnu', total:12, items:[{id:'p1',name:'Ancien nom',qty:1}]},
    row('delivered',4,'2026-10-20T00:00:00Z','emporter'),
    row('delivered',9,'2026-10-19T22:59:59Z'),
    row('delivered',10,'2026-10-26T12:01:00Z'),
    {total:99, createdAt:null}
];
const week = analyzeOrders(history, reportTime, zone);
equal(week.count,5,'Week counts received orders inside seven local dates through now');
equal(week.rejected,1,'Refusals count toward incoming demand');
equal(week.recordedValue,16.30,'Cents sum all non-refused stored totals');
equal(week.average,16.30/4,'Average uses non-refused tickets');
equal(week.days.map(day=>day.count),[1,0,0,0,0,1,3],'Seven daily buckets include empty days and use local midnight');
equal(week.hours.reduce((a,b)=>a+b,0),5,'Staffing buckets reconcile to received count');
equal(week.hours[0],1,'Hour 00 reflects the restaurant clock');
equal(week.services.reduce((sum,service)=>sum+service.count,0),5,'Service breakdown reconciles');
equal(week.services.find(service=>service.key==='other').count,1,'Missing or unrecognised service grouped separately');
equal(week.totalUnits,7,'Rejected units excluded from menu planning');
equal(week.products[0],{name:'Burger maison',quantity:3},'A renamed product retains its stable ID and latest label');
const todayReport = analyzeOrders(history,reportTime,zone,'today');
equal(todayReport.recordedValue,0.30,'Decimal amounts are accumulated in minor units');
equal(todayReport.rejected,1,'Refusals with missing totals and quantities do not invalidate eligible data');
equal(todayReport.invalidTotals+todayReport.invalidQuantities,0,'Rejected lines cannot suppress menu or amount metrics');
const yesterdayReport = analyzeOrders(history,reportTime,zone,'yesterday','other');
equal(yesterdayReport.days,[{key:'2026-10-25',count:1}],'Yesterday uses local calendar day');
equal(yesterdayReport.services,[{key:'other',count:1,rejected:0,recordedValue:12,average:12}],'Service and date filters intersect');
const delivery = analyzeOrders(history,reportTime,zone,'today','livraison');
equal([delivery.count,delivery.rejected,delivery.recordedValue,delivery.totalUnits],[2,1,0.10,2],'Delivery demand and value use consistent scopes');
const damaged = analyzeOrders([...history,{...rows[0],total:'',items:[null,{name:'Frites',qty:true}]}],reportTime,zone,'today');
equal([damaged.recordedValue,damaged.average,damaged.invalidTotals],[null,null,1],'Missing money suppresses both dependent totals');
equal(damaged.services.find(service=>service.key==='emporter').recordedValue,0.20,'An unrelated service retains valid monetary metrics');
equal([damaged.products,damaged.totalUnits,damaged.invalidQuantities],[[],null,2],'Malformed product quantities cannot produce misleading shares');
const empty = analyzeOrders([],reportTime,zone);
for (const [month,length] of [['2024-02',29],['2025-02',28],['2025-12',31],['2026-09',30]]) {
    const report = analyzeOrders([], reportTime, zone, 'month', 'all', month);
    equal([report.days.length,report.days[0].key,report.days.at(-1).key],[length,month+'-01',month+'-'+length],'Calendar month boundaries for '+month);
}
equal([empty.count,empty.recordedValue,empty.average,empty.totalUnits],[0,0,null,0],'Empty volume and value are zero with undefined average');
console.log(`${checks} admin reporting/policy checks passed`);
