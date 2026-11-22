import {auth,db,collection,doc,query,onSnapshot,getDocs,runTransaction} from '../firebase-config.js';
import {limit} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {profileRole} from './admin-model.js';
import {MENU_LIMIT,copy,fingerprint,materializeProduct,productIssues,groupIssues,ordered,newId} from './menu-model.js';
import {MenuImportError, importCollections, parseMenuImport, planMenuImport, checkImportCapacity} from './menu-import.js';

export class MenuError extends Error { constructor(message){super(message);this.name='MenuError';} }
export const watchMenu = (name,next,error) => onSnapshot(query(collection(db,name),limit(MENU_LIMIT+1)),{includeMetadataChanges:true},snapshot=>next({rows:ordered(snapshot.docs.map(row=>({...row.data(),id:row.id}))),cached:!!(snapshot.metadata?.fromCache||snapshot.metadata?.hasPendingWrites),partial:snapshot.docs.length>MENU_LIMIT}),error);
export function createMenuService(session) {
    const ref=(name,id)=>doc(db,name,id);
    async function transact(callback) {
        const actor=session();
        if(!actor||!['admin','manager'].includes(profileRole(actor))||auth.currentUser?.uid!==actor.uid)throw new MenuError('Votre compte ne peut pas modifier la carte.');
        if(!navigator.onLine)throw new MenuError('Hors connexion. Reconnectez-vous avant d’enregistrer.');
        return runTransaction(db,async tx=>{
            const membership=await tx.get(ref('users',actor.uid)),live=session();
            if(!membership.exists()||!['admin','manager'].includes(profileRole(membership.data()))||!live||live.uid!==actor.uid||live.epoch!==actor.epoch||live.role!==actor.role)throw new MenuError('Votre accès a changé. Reconnectez-vous.');
            // Development schema proposal: serializes current-builder writes and
            // allocates unique positions. No live document is provisioned on read.
            const stateRef=ref('settings','menuState'),snapshot=await tx.get(stateRef);
            const state=snapshot.exists()?copy(snapshot.data()):{};
            const result=await callback(tx,state);
            tx.set(stateRef,{...state,revision:newId()});
            return result;
        });
    }
    const unchanged=(snapshot,expected)=>{if(!snapshot.exists()||fingerprint({...snapshot.data(),id:snapshot.id})!==fingerprint(expected))throw new MenuError('Ce contenu a changé sur un autre appareil. Fermez cette fiche et rechargez avant de réessayer.');};

    async function readImportCatalogue() {
        const snapshots = await Promise.all(importCollections.map(name => getDocs(query(collection(db, name), limit(MENU_LIMIT + 1)))));
        if (snapshots.some(snap => snap.metadata?.fromCache || snap.metadata?.hasPendingWrites || snap.docs.length > MENU_LIMIT)) {
            throw new MenuImportError('Impossible de vérifier tout le catalogue. Actualisez la carte et réessayez.');
        }
        return Object.fromEntries(importCollections.map((name, index) => [
            name, snapshots[index].docs.map(row => ({...row.data(), id: row.id}))
        ]));
    }

    return {
        async previewImport(source) {
            const menu = parseMenuImport(source);
            const catalogue = await readImportCatalogue();
            const plan = planMenuImport(menu, catalogue);
            checkImportCapacity(plan, catalogue);
            return plan;
        },
        async importMenu(source, reviewedPlan) {
            const menu = parseMenuImport(source);
            const ids = Object.fromEntries(importCollections.map(name => [
                name, new Map(menu[name].map(row => [row.id, newId()]))
            ]));
            return transact(async (tx, state) => {
                const catalogue = await readImportCatalogue();
                const plan = planMenuImport(menu, catalogue);
                checkImportCapacity(plan, catalogue);
                if (fingerprint(plan) !== fingerprint(reviewedPlan)) {
                    throw new MenuImportError('Le catalogue a changé. Vérifiez à nouveau le fichier avant d’importer.');
                }

                const pending = [];
                const categories = new Map();
                const groups = new Map();
                const categoryNames = Object.fromEntries(catalogue.categories.map(row => [row.id, row.name]));
                const productCategories = {...state.productCategories};
                const nextOrder = (name, minimum = 0) => Math.max(minimum, ...catalogue[name].map(row => (Number(row.order) || 0) + 1));
                let categoryOrder = nextOrder('categories', Number(state.nextCategoryOrder) || 0);
                let productOrder = nextOrder('menuItems', Number(state.nextProductOrder) || 0);
                let promotionOrder = nextOrder('promotions', 1);

                for (const {row, existingId} of plan.categories) {
                    const categoryId = existingId || ids.categories.get(row.id);
                    const existing = catalogue.categories.find(category => category.id === existingId);
                    const name = existing?.name ?? row.name;
                    categories.set(row.id, {id: categoryId, name});
                    if (existingId) continue;
                    categoryNames[categoryId] = name;
                    pending.push(['categories', categoryId, {name, isVisible: false, order: categoryOrder++}]);
                }

                for (const {row, existingId} of plan.modifierGroups) {
                    const groupId = existingId || ids.modifierGroups.get(row.id);
                    const existing = catalogue.modifierGroups.find(group => group.id === existingId);
                    const {id: _fileId, ...definition} = row;
                    const group = existing || ({...definition, id: groupId, options: definition.options.map(option => ({...option, id: newId()})), productIds: []});
                    groups.set(row.id, {group, existingId, added: []});
                }

                for (const {row, existingId} of plan.menuItems) {
                    if (existingId) continue;
                    const {id: localId, ...item} = row;
                    const productId = ids.menuItems.get(localId);
                    const category = categories.get(row.categoryId);
                    const linked = row.modifierGroupIds.map(id => groups.get(id));
                    linked.forEach(entry => entry.added.push(productId));
                    const product = materializeProduct({
                        ...item, categoryId: category.id, category: category.name, order: productOrder++,
                        modifierGroupIds: linked.map(entry => entry.group.id), isVisible: false, imageUrl: ''
                    }, linked.map(entry => entry.group));
                    const issues = productIssues(product, [category]);
                    if (issues.length) throw new MenuImportError(`${product.name} — ${issues[0][1]}`);
                    productCategories[productId] = category.id;
                    pending.push(['menuItems', productId, product]);
                }

                for (const {group, existingId, added} of groups.values()) {
                    const {id: groupId, ...definition} = group;
                    if (existingId && !added.length) continue;
                    const productIds = [...new Set([...(definition.productIds || []), ...added])];
                    if (productIds.length > MENU_LIMIT) throw new MenuImportError(`${group.title} — Trop de produits liés.`);
                    pending.push(['modifierGroups', groupId, existingId ? {productIds} : {...definition, productIds}, !!existingId]);
                }

                for (const {row, existingId} of plan.promotions) {
                    if (existingId) continue;
                    const {id: localId, ...offer} = row;
                    pending.push(['promotions', ids.promotions.get(localId), {
                        ...offer, order: promotionOrder++, isVisible: false, imageUrl: ''
                    }]);
                }

                if (!pending.length) throw new MenuImportError('Tous les éléments du fichier existent déjà.');
                if (new TextEncoder().encode(JSON.stringify(pending)).length > 2 * 1024 * 1024) {
                    throw new MenuImportError('Les groupes liés produisent un import trop volumineux. Divisez le menu en plusieurs fichiers.');
                }

                const reusable = [...plan.categories.filter(row => row.existingId).map(row => ['categories', row.existingId]),
                    ...[...groups.values()].filter(entry => entry.existingId && entry.added.length).map(entry => ['modifierGroups', entry.existingId])];
                const snapshots = await Promise.all(reusable.map(([name, id]) => tx.get(ref(name, id))));
                reusable.forEach(([name, id], index) => unchanged(snapshots[index], catalogue[name].find(row => row.id === id)));
                for (const [name, id, value, update] of pending) {
                    if (update) tx.update(ref(name, id), value);
                    else tx.set(ref(name, id), value);
                }
                Object.assign(state, {categoryNames, productCategories, nextCategoryOrder: categoryOrder, nextProductOrder: productOrder});
            });
        },
        async product(draft,expected,categories,{remove=false}={}) {
            const id=expected?.id || newId();
            return transact(async (tx,state)=>{
                const itemRef=ref('menuItems',id),before=await tx.get(itemRef);
                if(expected)unchanged(before,expected);else if(before.exists())throw new MenuError('Cet identifiant existe déjà. Réessayez.');
                if(remove) {
                    const groupIds=[...new Set(expected?.modifierGroupIds||before.data()?.modifierGroupIds||[])];
                    const groupDocs=await Promise.all(groupIds.map(gid=>tx.get(ref('modifierGroups',gid))));
                    for(const groupSnap of groupDocs.filter(g=>g.exists())) {
                        const pids=(groupSnap.data().productIds||[]).filter(pid=>pid!==id);
                        tx.update(ref('modifierGroups',groupSnap.id),{productIds:pids});
                    }
                    if(state.productCategories)delete state.productCategories[id];
                    tx.delete(itemRef);
                    return id;
                }
                const category=categories.find(row=>row.id===draft.categoryId || !draft.categoryId&&row.name===draft.category);
                if(!category)throw new MenuError('Choisissez une catégorie.');
                const categorySnap=await tx.get(ref('categories',category.id));
                if(!categorySnap.exists())throw new MenuError('La catégorie a été supprimée. Choisissez-en une autre.');
                const groupIds=[...new Set([...(expected?.modifierGroupIds||[]),...(draft.modifierGroupIds||[])])];
                const groupDocs=await Promise.all(groupIds.map(id=>tx.get(ref('modifierGroups',id))));
                const groups=groupDocs.filter(row=>row.exists()).map(row=>({...row.data(),id:row.id}));
                if((draft.modifierGroupIds||[]).some(id=>!groups.some(group=>group.id===id)))throw new MenuError('Un groupe partagé a été supprimé. Détachez-le ou rechargez.');
                const product=materializeProduct({...draft,id,categoryId:category.id,category:categorySnap.data().name},groups);
                if(!expected){product.order=Math.max(Number(state.nextProductOrder)||0,Number(draft.order)||0);state.nextProductOrder=product.order+1;}
                state.productCategories={...(state.productCategories||{}),[id]:category.id};
                const issues=productIssues(product,[{...categorySnap.data(),id:category.id}]);if(issues.length)throw new MenuError(issues[0][1]);
                delete product.id;
                for(const group of groups) {
                    const ids=new Set(group.productIds||[]);ids.delete(id);if((draft.modifierGroupIds||[]).includes(group.id))ids.add(id);
                    if(ids.size>MENU_LIMIT)throw new MenuError('Ce groupe atteint la limite locale de produits.');
                    tx.update(ref('modifierGroups',group.id),{productIds:[...ids]});
                }
                if(expected)tx.update(itemRef,product);else tx.set(itemRef,product);
                return id;
            });
        },
        async bulk(rows,patch,{remove=false}={}) {
            if(!rows.length||rows.length>MENU_LIMIT)throw new MenuError('Sélectionnez entre 1 et 300 produits.');
            return transact(async (tx,state)=>{
                const snapshots=await Promise.all(rows.map(row=>tx.get(ref('menuItems',row.id))));
                rows.forEach((row,index)=>unchanged(snapshots[index],row));
                if(remove) {
                    const allGroupIds=[...new Set(rows.flatMap(r=>r.modifierGroupIds||[]))];
                    const groupDocs=await Promise.all(allGroupIds.map(gid=>tx.get(ref('modifierGroups',gid))));
                    const removedIds=new Set(rows.map(r=>r.id));
                    for(const groupSnap of groupDocs.filter(g=>g.exists())) {
                        const pids=(groupSnap.data().productIds||[]).filter(pid=>!removedIds.has(pid));
                        tx.update(ref('modifierGroups',groupSnap.id),{productIds:pids});
                    }
                    for(const row of rows) {
                        if(state.productCategories)delete state.productCategories[row.id];
                        tx.delete(ref('menuItems',row.id));
                    }
                    return;
                }
                let category=null;
                if(patch.categoryId){category=await tx.get(ref('categories',patch.categoryId));if(!category.exists())throw new MenuError('La catégorie n’existe plus.');}
                rows.forEach(row=>tx.update(ref('menuItems',row.id),{...patch,...(category?{category:category.data().name}:{})}));
                if(category)for(const row of rows)state.productCategories={...(state.productCategories||{}),[row.id]:category.id};
            });
        },
        async category(draft,expected,products,categories,{remove=false,targetId=''}={}) {
            return transact(async (tx,state)=>{
                const id=expected?.id||newId(),categoryRef=ref('categories',id),before=await tx.get(categoryRef);
                if(expected)unchanged(before,expected);
                const affected=products.filter(row=>row.categoryId===id || !row.categoryId&&row.category===expected?.name);
                const affectedIds=[...new Set([...affected.map(row=>row.id),...Object.entries(state.productCategories||{}).filter(([,categoryId])=>categoryId===id).map(([productId])=>productId)])];
                const allCategories=await Promise.all(categories.map(row=>tx.get(ref('categories',row.id))));
                const names=state.categoryNames||Object.fromEntries(allCategories.filter(row=>row.exists()).map(row=>[row.id,row.data().name]));
                if(!remove && (!draft.name.trim() || Object.entries(names).some(([key,name])=>key!==id&&name.trim().toLowerCase()===draft.name.trim().toLowerCase())))throw new MenuError('Donnez un nom de catégorie unique.');
                const target=remove&&targetId?allCategories.find(row=>row.id===targetId&&row.exists()):null;
                if(remove&&affectedIds.length&&!target)throw new MenuError('Choisissez une catégorie de destination pour ces produits.');
                const productDocs=await Promise.all(affectedIds.map(id=>tx.get(ref('menuItems',id))));
                affected.forEach(row=>unchanged(productDocs.find(snapshot=>snapshot.id===row.id),row));
                productDocs.filter(row=>row.exists()).forEach(row=>{
                    tx.update(ref('menuItems',row.id),remove?{categoryId:target.id,category:target.data().name}:{categoryId:id,category:draft.name.trim()});
                    state.productCategories={...(state.productCategories||{}),[row.id]:remove?target.id:id};
                });
                if(remove)delete names[id];else names[id]=draft.name.trim();state.categoryNames=names;
                if(!expected){draft={...draft,order:Math.max(Number(state.nextCategoryOrder)||0,Number(draft.order)||0)};state.nextCategoryOrder=draft.order+1;}
                if(remove)tx.delete(categoryRef);else if(expected)tx.update(categoryRef,draft);else tx.set(categoryRef,draft);
                return id;
            });
        },
        async group(draft,expected,{remove=false}={}) {
            if(!remove && groupIssues(draft).length)throw new MenuError(groupIssues(draft)[0]);
            return transact(async tx=>{
                const id=expected?.id||newId(),groupRef=ref('modifierGroups',id),before=await tx.get(groupRef);
                if(expected) {
                    const current=before.exists()?{...before.data(),id:before.id}:null,previous={...expected};
                    if(current)delete current.productIds;delete previous.productIds;
                    if(!current||fingerprint(current)!==fingerprint(previous))throw new MenuError('Ce groupe a changé sur un autre appareil. Rechargez-le avant de réessayer.');
                }
                const productIds=before.exists()?before.data().productIds||[]:[];
                if(productIds.length>MENU_LIMIT)throw new MenuError('Trop de produits liés pour une opération atomique.');
                const products=await Promise.all(productIds.map(id=>tx.get(ref('menuItems',id))));
                const group={...draft,id,productIds};
                for(const snapshot of products.filter(row=>row.exists())) {
                    const product={...snapshot.data(),id:snapshot.id};
                    if(!(product.modifierGroupIds||[]).includes(id))continue;
                    let result;
                    if(remove){result={...product,modifierGroupIds:product.modifierGroupIds.filter(key=>key!==id),mandatoryChoices:(product.mandatoryChoices||[]).map(({sourceGroupId,...row})=>sourceGroupId===id?row:{...row,...(sourceGroupId?{sourceGroupId}:{})}),supplements:(product.supplements||[]).map(({sourceGroupId,...row})=>sourceGroupId===id?row:{...row,...(sourceGroupId?{sourceGroupId}:{})})};}
                    else result=materializeProduct(product,[group]);
                    delete result.id;tx.update(snapshot.ref,result);
                }
                const value={...draft,productIds};
                if(remove)tx.delete(groupRef);else if(expected)tx.update(groupRef,value);else tx.set(groupRef,value);
                return id;
            });
        },
        async reorder(name,rows) {
            return transact(async tx=>{
                const snapshots=await Promise.all(rows.map(row=>tx.get(ref(name,row.id))));rows.forEach((row,index)=>unchanged(snapshots[index],row));
                rows.forEach((row,index)=>tx.update(ref(name,row.id),{order:index}));
            });
        }
    };
}
