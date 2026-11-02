// Shared client configuration/availability rules. These are not backend authorization.
import {buildCustomizationSteps,selectionIssue,optionMatches,recordedChoices,moneyCents} from './customization.js';
export const MENU_LIMIT = 300;
export const copy = value => JSON.parse(JSON.stringify(value));
export const newId = () => globalThis.crypto.randomUUID();
export const selectionPresets=[['one','Exactement un choix'],['upto','Jusqu’à N choix'],['atleast','Au moins N choix'],['between','Entre N et M choix'],['custom','Personnalisé']];
export function selectionPreset(group){return group.type==='radio'?'one':Number(group.min)===0&&Number(group.max)>0?'upto':Number(group.min)>0&&Number(group.max)===0?'atleast':Number(group.min)>0&&Number(group.max)>0?'between':'custom';}
export function applySelectionPreset(group,preset){
    const min=Math.max(1,Number(group.min)||1),max=Math.max(2,Number(group.max)||2);
    return preset==='one'?{type:'radio',min:1,max:1}:preset==='upto'?{type:'checkbox',min:0,max}:preset==='atleast'?{type:'checkbox',min,max:0}:preset==='between'?{type:'checkbox',min,max:Math.max(min,max)}:{};
}
export function groupTemplate(key='blank'){
    const template={sizes:['Taille','radio',1,1,['M','L','XL']],sauces:['Sauces','checkbox',0,0,['Sauce 1','Sauce 2']],meats:['Viandes','radio',1,1,['Viande 1','Viande 2']]}[key]||['','radio',1,1,['']];
    const [title,type,min,max,names]=template;
    return {title,type,min,max,options:names.map(name=>({id:newId(),name,price:0,isAvailable:true}))};
}
export function duplicateOption(options,index){
    const result=copy(options[index]);result.id=newId();const base=String(result.name||'Option').slice(0,100);let suffix=1;
    do{result.name=`${base} (copie${suffix===1?'':' '+suffix})`;suffix++;}while(options.some(option=>option.name?.toLocaleLowerCase('fr')===result.name.toLocaleLowerCase('fr')));
    return result;
}
export const ordered = rows => [...rows].sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0) || String(a.id).localeCompare(String(b.id)));
export const categoryFor = (item,categories) => item.categoryId ? categories.find(c=>c.id===item.categoryId) : categories.find(c=>c.name===item.category);
export const listed = (item,categories) => item?.isVisible!==false && (!item?.categoryId || !!categoryFor(item,categories)) && categoryFor(item,categories)?.isVisible!==false;
export const available = item => item?.isAvailable!==false;
export const fingerprint = value => {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value, (_key, v) => typeof v === 'function' ? undefined : v);
    }
    if (typeof value.toDate === 'function') {
        return JSON.stringify(value.toDate().toISOString());
    }
    if (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
        return JSON.stringify({ seconds: value.seconds, nanoseconds: value.nanoseconds });
    }
    if (Array.isArray(value)) {
        return '[' + value.map(fingerprint).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    return '{' + keys.filter(k => typeof value[k] !== 'function' && value[k] !== undefined).map(k => JSON.stringify(k) + ':' + fingerprint(value[k])).join(',') + '}';
};
export const validPrice = value => ['number','string'].includes(typeof value) && String(value).trim()!=='' && Number.isFinite(Number(value)) && Number(value)>=0 && Number(value)<=1000000 && Math.abs(Number(value)*100-Math.round(Number(value)*100))<.00001;
export function groupIssues(group) {
    const issues=[]; const options=group.options || [], min=Number(group.min), max=Number(group.max);
    if(!String(group.title||'').trim()) issues.push('Donnez un nom au groupe.');
    if(!['radio','checkbox'].includes(group.type)) issues.push('Choisissez un type de sélection.');
    if(!Number.isInteger(min)||min<0||!Number.isInteger(max)||max<0) issues.push('Minimum et maximum doivent être des nombres entiers positifs ou nuls.');
    if(group.type==='radio' && (min>1 || max!==1)) issues.push('Un choix unique accepte au maximum une option.');
    if(group.kind==='supplements' && (group.type!=='checkbox'||min!==0||max!==0))issues.push('Les suppléments sont facultatifs et sans limite. Pour imposer un nombre de sélections, utilisez un groupe de choix avec des prix.');
    if(max>0 && min>max) issues.push('Le minimum ne peut pas dépasser le maximum.');
    if(!options.length) issues.push('Ajoutez au moins une option.');
    if(options.length>60)issues.push('Un groupe peut contenir au maximum 60 options.');
    if(options.filter(available).length<min) issues.push('Le groupe obligatoire n’a pas assez d’options disponibles.');
    const ids=new Set(),names=new Set();
    for(const option of options) {
        const name=String(option.name||'').trim().toLocaleLowerCase('fr');
        if(!name) issues.push('Chaque option doit avoir un nom.');
        if(names.has(name)) issues.push('Les noms des options doivent être uniques dans un groupe.'); names.add(name);
        if(option.id && ids.has(option.id)) issues.push('Les identifiants des options doivent être uniques.'); if(option.id)ids.add(option.id);
        if(!validPrice(option.price)) issues.push('Le prix de chaque option doit être positif ou nul, avec deux décimales au maximum.');
    }
    return [...new Set(issues)];
}
export function productIssues(product,categories) {
    const issues=[];
    if(!String(product.name||'').trim()) issues.push(['name','Indiquez le nom du produit.']);
    if(!validPrice(product.price)) issues.push(['price','Indiquez un prix valide, positif ou nul, avec deux décimales au maximum.']);
    if(!categoryFor(product,categories)) issues.push(['categoryId','Choisissez une catégorie existante.']);
    if((product.mandatoryChoices||[]).length>20 || (product.modifierGroupIds||[]).length>12)issues.push(['choices','Limite : 20 groupes au total et 12 groupes partagés par produit.']);
    (product.mandatoryChoices||[]).forEach((group,index)=>groupIssues(group).forEach(message=>issues.push(['choices',`Groupe ${index+1} : ${message}`])));
    if(product.supplements?.length) groupIssues({title:'Suppléments',type:'checkbox',min:0,max:0,options:product.supplements}).forEach(message=>issues.push(['extras',message]));
    return issues;
}
export function materializeProduct(product,groups) {
    const result=copy(product), linked=new Set(result.modifierGroupIds||[]);
    result.mandatoryChoices=(result.mandatoryChoices||[]).filter(group=>!linked.has(group.sourceGroupId));
    result.supplements=(result.supplements||[]).filter(option=>!linked.has(option.sourceGroupId));
    // Missing definitions retain recorded snapshots; shared definitions are never
    // required by older storefronts to render a saved product.
    for(const id of linked) {
        const group=groups.find(group=>group.id===id);
        if(!group) {
            result.mandatoryChoices.push(...copy((product.mandatoryChoices||[]).filter(row=>row.sourceGroupId===id)));
            result.supplements.push(...copy((product.supplements||[]).filter(row=>row.sourceGroupId===id)));
        } else if(group.kind==='supplements') result.supplements.push(...copy(group.options).map(option=>({...option,sourceGroupId:id})));
        else result.mandatoryChoices.push({...copy(group),sourceGroupId:id});
    }
    return result;
}
export function independentProduct(product) {
    const result=copy(product); delete result.id; delete result.createdAt;
    result.name=`${result.name} (copie)`; result.isVisible=false; result.modifierGroupIds=[];
    result.mandatoryChoices=(result.mandatoryChoices||[]).map(({sourceGroupId,productIds,...group})=>group);
    result.supplements=(result.supplements||[]).map(({sourceGroupId,...option})=>option);
    return result;
}
export function imageIssue(file) {
    if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Choisissez une image JPG, PNG ou WebP.';
    if(file.size>5*1024*1024) return 'L’image doit faire moins de 5 Mo.';
    return '';
}
export function cartMenuIssue(cart,items,categories,promotions=[]) {
    for(const row of cart) {
        if(row.totalPrice!==undefined){try{moneyCents(row.totalPrice);}catch{return `Le montant de ${row.name} est invalide. Retirez cet article puis composez-le à nouveau.`;}}
        if(row.qty!==undefined&&(!Number.isSafeInteger(row.qty)||row.qty<1))return `La quantité de ${row.name} est invalide. Retirez cet article puis composez-le à nouveau.`;
        if(row.isPromo || !items.some(item=>item.id===row.id)&&promotions.some(item=>item.id===row.id)) {
            const promo=promotions.find(item=>item.id===row.id);
            if(!promo||promo.isVisible===false||!available(promo))return `${row.name} n’est plus disponible. Retirez cette offre du panier.`;
            if(Number(row.unitBasePrice)!==Number(promo.price))return `Le prix de ${row.name} a changé. Composez cette offre à nouveau.`;
            const possible=[...(promo.mandatoryChoices||[]).flatMap(group=>group.options||[]),...(promo.supplements||[])];
            if([...(row.selectedOptions||[]),...(row.supplements||[])].some(option=>!possible.some(current=>available(current)&&optionMatches(current,option))))return `Les options de ${row.name} ont changé. Composez cette offre à nouveau.`;
            const promoSteps=buildCustomizationSteps(promo).filter(step=>step.type==='choice');
            for(const step of promoSteps){
                if(selectionIssue(step,recordedChoices(step,promoSteps,row)))return `Les choix de ${row.name} ont changé. Composez cette offre à nouveau.`;
            }
            if(selectionIssue({type:'supplements',data:promo.supplements||[]},row.supplements||[]))return `Les suppléments de ${row.name} ont changé. Composez cette offre à nouveau.`;
            continue; // Promotions retain their independent pricing/configuration.
        }
        const product=items.find(item=>item.id===row.id);
        if(!product || !listed(product,categories) || !available(product)) return `${row.name} n’est plus disponible. Retirez ce produit du panier pour continuer.`;
        const options=[...(product.mandatoryChoices||[]).flatMap(group=>group.options||[]),...(product.supplements||[])];
        for(const selection of [...(row.selectedOptions||[]),...(row.supplements||[])]) {
            if(!options.some(option=>available(option)&&optionMatches(option,selection))) return `Les choix de ${row.name} ont changé. Retirez-le puis composez-le à nouveau.`;
        }
        if(Number(row.unitBasePrice)!==Number(product.price))return `Le prix de ${row.name} a changé. Retirez-le puis composez-le à nouveau.`;
        const steps=buildCustomizationSteps(product).filter(step=>step.type==='choice');
        for(const step of steps) {
            const choices=recordedChoices(step,steps,row);
            if(selectionIssue(step,choices))return `Les choix de ${row.name} ont changé. Retirez-le puis composez-le à nouveau.`;
        }
        if(selectionIssue({type:'supplements',data:product.supplements||[]},row.supplements||[]))return `Les suppléments de ${row.name} ont changé. Retirez-le puis composez-le à nouveau.`;
    }
    return '';
}
