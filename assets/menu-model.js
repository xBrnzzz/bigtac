// Shared client configuration/availability rules. These are not backend authorization.
import {buildCustomizationSteps,choiceRules,selectionIssue} from './customization.js';
export const MENU_LIMIT = 300;
export const copy = value => JSON.parse(JSON.stringify(value));
export const newId = () => globalThis.crypto.randomUUID();
export const ordered = rows => [...rows].sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0) || String(a.id).localeCompare(String(b.id)));
export const categoryFor = (item,categories) => item.categoryId ? categories.find(c=>c.id===item.categoryId) : categories.find(c=>c.name===item.category);
export const listed = (item,categories) => item?.isVisible!==false && (!item?.categoryId || !!categoryFor(item,categories)) && categoryFor(item,categories)?.isVisible!==false;
export const available = item => item?.isAvailable!==false;
export const fingerprint = value => JSON.stringify(value, (_key,value) => typeof value==='function'?undefined:value);
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
        if(row.isPromo || !items.some(item=>item.id===row.id)&&promotions.some(item=>item.id===row.id)) {
            const promo=promotions.find(item=>item.id===row.id);
            if(!promo||promo.isVisible===false||!available(promo))return `${row.name} n’est plus disponible. Retirez cette offre du panier.`;
            continue; // Promotions retain their independent pricing/configuration.
        }
        const product=items.find(item=>item.id===row.id);
        if(!product || !listed(product,categories) || !available(product)) return `${row.name} n’est plus disponible. Retirez ce produit du panier pour continuer.`;
        const options=[...(product.mandatoryChoices||[]).flatMap(group=>group.options||[]),...(product.supplements||[])];
        for(const selection of [...(row.selectedOptions||[]),...(row.supplements||[])]) {
            if(!options.some(option=>available(option)&&option.name===selection.name&&Number(option.price)===Number(selection.price))) return `Les choix de ${row.name} ont changé. Retirez-le puis composez-le à nouveau.`;
        }
        if(Number(row.unitBasePrice)!==Number(product.price))return `Le prix de ${row.name} a changé. Retirez-le puis composez-le à nouveau.`;
        const steps=buildCustomizationSteps(product).filter(step=>step.type==='choice');
        for(const [index,step] of steps.entries()) {
            const rule=choiceRules(step),recorded=row.choiceSelections?.[index];
            const choices=recorded&&recorded.title===step.title?recorded.options:(row.selectedOptions||[]).filter(option=>rule.options.some(current=>current.name===option.name));
            if(selectionIssue(step,choices))return `Les choix de ${row.name} ont changé. Retirez-le puis composez-le à nouveau.`;
        }
    }
    return '';
}
