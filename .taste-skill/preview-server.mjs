// Local visual fixture only. Never connects to Firebase or exposes the admin app.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mock = `
export const db = {};
const categories = ['Tacos Français', 'Tacos Gratinés', 'Burgers'];
const menu = [
 {id:'preview-poulet',name:'Tacos Poulet',category:categories[0],price:22,description:'Poulet, frites et sauce fromagère.',isPopular:true},
 {id:'preview-mixte',name:'Tacos Mixte',category:categories[0],price:25,description:'Deux viandes au choix, frites et sauce fromagère.'},
 {id:'preview-gratine',name:'Poulet Gratiné',category:categories[1],price:27,description:'Tacos au poulet, gratiné au fromage.'},
 {id:'preview-burger',name:'Burger',category:categories[2],price:25,description:'Steak, fromage, salade et sauce.'}
].map(x=>({...x,imageUrl:'/assets/tacos-hero.jpg',isVisible:true,mandatoryChoices:[],supplements:[]}));
export const collection = (_, name) => name;
export const doc = (_, name, id) => ({name,id});
export const query = x => x;
export const orderBy = () => null;
export const serverTimestamp = () => new Date();
export const getDocs = async name => {
 const rows = name==='categories'?categories.map((name,i)=>({id:'cat-'+i,name,order:i})):name==='menuItems'?menu:[];
 return {forEach:fn=>rows.forEach(x=>fn({id:x.id,data:()=>x})),empty:!rows.length};
};
export const onSnapshot = (ref, callback) => {
 if(ref.name==='settings') callback({exists:()=>true,data:()=>({isOpen:true,whatsappMode:false})});
 return ()=>{};
};
export const addDoc = async () => { throw new Error('Preview fixture: order submission disabled'); };
`;
http.createServer((req,res)=>{
 const pathname = new URL(req.url,'http://localhost').pathname;
 if(pathname==='/firebase-config.js') {res.setHeader('Content-Type','text/javascript');return res.end(mock);}
 const relative = pathname==='/'?'index.html':pathname.slice(1);
 if(!['index.html'].includes(relative)&&!relative.startsWith('assets/')) {res.writeHead(404);return res.end();}
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)) {res.writeHead(403);return res.end();}
 try {const content=fs.readFileSync(file);res.setHeader('Content-Type',({'html':'text/html','png':'image/png','webp':'image/webp','css':'text/css'})[path.extname(file).slice(1)]||'application/octet-stream');res.end(content);}catch {res.writeHead(404);res.end();}
}).listen(3107,'127.0.0.1',()=>console.log('Isolated BIGTAC preview: http://127.0.0.1:3107'));

