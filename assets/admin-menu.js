import {icon} from './admin-icons.js';
import {watchMenu,createMenuService} from './admin-menu-service.js';
import {MENU_LIMIT,copy,newId,ordered,categoryFor,materializeProduct,independentProduct,productIssues,groupIssues,imageIssue,fingerprint} from './menu-model.js';
import {buildCustomizationSteps,choiceRules,selectionIssue,customizationPrice} from './customization.js';

const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2}).format(Number(value)||0)} DH`;
const button=(label,action,glyph='note',extra='')=>`<button type="button" class="admin-button" data-menu-action="${action}" ${extra}>${icon(glyph)}${label}</button>`;
const field=(label,id,content)=>`<label class="menu-field" for="${id}"><span>${label}</span>${content}</label>`;
const input=(id,value='',type='text',extra='')=>`<input id="${id}" name="${id}" type="${type}" value="${e(value)}" ${extra}>`;
const check=(id,label,checked)=>`<label class="menu-check"><input type="checkbox" id="${id}" ${checked?'checked':''}>${label}</label>`;
const option=(value,label,selected)=>`<option value="${e(value)}" ${selected?'selected':''}>${e(label)}</option>`;

export function createMenuWorkspace(root,{session,toast,upload}) {
    const service=createMenuService(session);
    let data={menuItems:[],categories:[],modifierGroups:[]},stops=[],running=false,version=0,loading=true,readError='',blocked=true;
    let sharedReady=false;
    let search='',category='all',state='all',selected=new Set(),busy=false,draft=null,expected=null,baseline='',file=null,objectURL=null,section='basic';
    let categoryExpected=null,groupExpected=null,groupDraft=null,groupBaseline='',categoryBaseline='',previewSelections={};
    const dialogs={};
    root.className='menu-workspace hidden';
    root.innerHTML=`<header class="menu-heading"><div><h2>Votre carte</h2><p>Vos produits, leurs choix et leur disponibilité.</p></div><button class="admin-button primary" data-menu-action="new">${icon('plus')}Ajouter un produit</button></header>
        <div class="menu-tools"><label class="menu-search"><span class="sr-only">Rechercher un produit</span>${icon('search')}<input id="menu-admin-search" type="search" name="product-search" placeholder="Rechercher un produit…" autocomplete="off"></label>${field('Disponibilité','menu-state',`<select id="menu-state">${[['all','Tous les états'],['available','Disponibles'],['stock','Rupture de stock'],['hidden','Masqués']].map(([value,label])=>option(value,label)).join('')}</select>`)}${button('Catégories','categories','grid')}${button('Groupes de choix','groups','sliders')}${button('Actualiser','refresh','refresh')}</div>
        <nav id="menu-categories-list" class="menu-category-chips" aria-label="Catégories des produits"></nav><div id="menu-feedback" role="status" class="menu-feedback"></div>
        <div id="menu-bulk" class="menu-bulk" hidden><strong id="menu-selected"></strong><select id="menu-bulk-action" aria-label="Action groupée"><option value="stock">Mettre en rupture</option><option value="available">Rendre disponible</option><option value="hide">Masquer</option><option value="show">Publier</option><option value="move">Changer de catégorie</option></select><select id="menu-bulk-category" aria-label="Catégorie de destination"></select>${button('Appliquer','bulk','check')}${button('Annuler la sélection','clear','x')}</div>
        <div class="menu-list-heading"><h3 id="active-category-title">Tous les produits</h3><span id="menu-count"></span></div><div id="items-grid" class="menu-products" aria-label="Produits"></div>`;
    for(const [id,title] of [['item-editor','Produit'],['menu-categories-dialog','Catégories'],['menu-groups-dialog','Groupes réutilisables'],['menu-group-editor','Groupe de choix'],['menu-preview','Aperçu client']]) {
        if(id==='item-editor')document.getElementById(id)?.remove();
        const dialog=document.createElement('dialog');dialog.id=id;dialog.className='menu-dialog';dialog.setAttribute('aria-labelledby',`${id}-title`);
        dialog.innerHTML=`<header><div><p>Menu Builder</p><h2 id="${id}-title">${title}</h2></div>${button('Fermer','close','x',`data-dialog="${id}"`)}</header><div class="menu-dialog-body"></div><footer></footer>`;
        document.body.append(dialog);dialogs[id]=dialog;
        dialog.addEventListener('cancel',event=>{event.preventDefault();close(id);});
        dialog.addEventListener('keydown',event=>{
            if(event.key!=='Tab')return;
            const targets=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length);
            if(!event.shiftKey&&document.activeElement===targets.at(-1)){event.preventDefault();targets[0]?.focus();}
            else if(event.shiftKey&&document.activeElement===targets[0]){event.preventDefault();targets.at(-1)?.focus();}
        });
    }
    document.getElementById('category-editor-modal')?.remove();
    const body=id=>dialogs[id].querySelector('.menu-dialog-body');
    const footer=id=>dialogs[id].querySelector('footer');
    const $=id=>document.getElementById(id);
    const message=error=>error.name==='MenuError'?error.message:'Enregistrement non confirmé. Vérifiez votre connexion ou vos autorisations, puis réessayez.';
    const isDirty=()=>draft&&(fingerprint(draft)!==baseline||!!file);
    const allowed=()=>running&&session()&&['admin','manager'].includes(session().role);
    function close(id,force=false) {
        if(!force && busy)return false;
        const dirty=id==='item-editor'?isDirty():id==='menu-group-editor'?groupDraft&&fingerprint(groupDraft)!==groupBaseline:id==='menu-categories-dialog'?categoryExpected!==undefined && categoryFormValue()!==categoryBaseline:false;
        if(!force && dirty&&!confirm('Quitter sans enregistrer les modifications ?'))return false;
        dialogs[id].close();if(id==='item-editor'){draft=null;file=null;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;}
        return true;
    }
    function paint() {
        const categories=data.categories,items=ordered(data.menuItems),rows=items.filter(item=>(category==='all'||categoryFor(item,categories)?.id===category)&&(!search||`${item.name} ${item.category}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))&&(state==='all'||state==='hidden'&&item.isVisible===false||state==='stock'&&item.isAvailable===false||state==='available'&&item.isAvailable!==false));
        $('menu-categories-list').innerHTML=`${button('Tout voir','filter','grid',`data-category="all" aria-pressed="${category==='all'}"`)}${categories.map(row=>button(`${e(row.name)} · ${items.filter(item=>categoryFor(item,categories)?.id===row.id).length}`,'filter','grid',`data-category="${e(row.id)}" aria-pressed="${category===row.id}"`)).join('')}`;
        $('menu-count').textContent=`${rows.length} / ${items.length} produits`;
        $('active-category-title').textContent=categories.find(row=>row.id===category)?.name||'Tous les produits';
        $('menu-feedback').textContent=busy?'Enregistrement…':loading?'Chargement de la carte…':'';
        if(readError)$('menu-feedback').textContent=readError;
        else if(blocked&&!loading)$('menu-feedback').textContent='Carte en cache, incomplète ou groupes non vérifiés : les modifications attendent une lecture complète du serveur.';
        $('menu-feedback').hidden=!busy&&!loading&&!readError&&!blocked;
        $('items-grid').innerHTML=rows.map(item=>`<div class="menu-product ${item.isAvailable===false?'menu-product--stock':''}" data-product="${e(item.id)}"><label class="menu-select"><input type="checkbox" aria-label="Sélectionner ${e(item.name)}" data-select="${e(item.id)}" ${selected.has(item.id)?'checked':''}></label><img src="${e(safeImage(item.imageUrl))}" width="72" height="72" alt=""><div class="menu-product-info"><h4>${e(item.name)}</h4><p>${e(categoryFor(item,categories)?.name||item.category||'Catégorie manquante')}</p><div class="menu-badges"><span class="menu-badge ${item.isVisible===false?'muted':'green'}">${icon(item.isVisible===false?'off':'check')}${item.isVisible===false?'Masqué':'Publié'}</span>${item.isPopular?`<span class="menu-badge purple">${icon('tag')}Best Seller</span>`:''}${categoryFor(item,categories)?.isVisible===false?'<span class="menu-badge amber">Catégorie masquée</span>':''}</div></div><strong class="menu-price">${money(item.price)}</strong><button class="menu-stock" data-menu-action="stock" data-id="${e(item.id)}" role="switch" aria-checked="${item.isAvailable!==false}" aria-label="Disponibilité de ${e(item.name)}" ${busy||blocked?'disabled':''}>${icon(item.isAvailable===false?'off':'check')}<span>${item.isAvailable===false?'Rupture de stock':'Disponible'}</span></button><div class="menu-row-actions">${button('Modifier','edit','note',`data-id="${e(item.id)}"`)}<details><summary aria-label="Autres actions pour ${e(item.name)}">•••</summary><div>${button('Dupliquer','duplicate','plus',`data-id="${e(item.id)}"`)}${button(item.isVisible===false?'Publier':'Masquer','visibility','off',`data-id="${e(item.id)}"`)}${button('Monter','up','arrow',`data-id="${e(item.id)}"`)}${button('Descendre','down','arrow',`data-id="${e(item.id)}"`)}</div></details></div></div>`).join('')||`<div class="menu-empty">${icon(loading?'clock':'shopping-bag')}<h3>${loading?'Chargement…':'Aucun produit à afficher'}</h3><p>${search||state!=='all'?'Modifiez vos filtres.':'Ajoutez votre premier produit ou choisissez une autre catégorie.'}</p></div>`;
        root.querySelectorAll('img').forEach(img=>img.onerror=()=>{img.onerror=null;img.src='assets/tacos-campaign.jpg';});
        $('menu-bulk').hidden=!selected.size;$('menu-selected').textContent=`${selected.size} sélectionné(s)`;
        $('menu-bulk-category').innerHTML=categories.map(row=>option(row.id,row.name)).join('');
        root.querySelectorAll('button[data-menu-action]:not([data-menu-action=filter]):not([data-menu-action=refresh]):not([data-menu-action=clear])').forEach(button=>button.disabled=busy||blocked);
    }
    function safeImage(value){return typeof value==='string'&&(/^(https?:|blob:)/.test(value)||/^assets\/[\w./-]+$/.test(value))?value:'assets/tacos-campaign.jpg';}
    async function operation(action,done) {
        if(busy||blocked||!allowed())return false;busy=true;readError='';const generation=version;paint();
        document.querySelectorAll('.menu-dialog[open] button').forEach(button=>button.disabled=true);
        const activeDialog=Object.values(dialogs).find(dialog=>dialog.open);let status=activeDialog?.querySelector('[data-save-state]');
        if(status){status.textContent='Enregistrement…';status.setAttribute('role','status');}
        try {await action();if(generation===version){toast('Modification enregistrée.');done?.();}return true;}
        catch(error){if(generation===version){toast(message(error),'error');if(status){status.textContent=message(error);status.setAttribute('role','alert');}else{readError=message(error);}}return false;}
        finally{if(generation===version){busy=false;paint();document.querySelectorAll('.menu-dialog button').forEach(button=>button.disabled=false);}}
    }
    function openProduct(id,duplicate=false) {
        if(!allowed()||blocked)return;
        const source=data.menuItems.find(row=>row.id===id);expected=duplicate?null:source||null;
        draft=source?(duplicate?independentProduct(materializeProduct(source,data.modifierGroups)):copy(source)):{name:'',description:'',price:0,categoryId:category==='all'?data.categories[0]?.id||'':category,isAvailable:true,isVisible:true,isPopular:false,mandatoryChoices:[],supplements:[],modifierGroupIds:[],order:Math.max(-1,...data.menuItems.map(row=>Number(row.order)||0))+1};
        draft.categoryId ||= categoryFor(draft,data.categories)?.id||'';
        draft.description ||= '';draft.price=Number(draft.price??0);draft.isAvailable=draft.isAvailable!==false;draft.isVisible=draft.isVisible!==false;draft.isPopular=draft.isPopular===true;
        if(!expected)draft.order=Math.max(-1,...data.menuItems.map(row=>Number(row.order)||0))+1;
        draft.mandatoryChoices ||= [];draft.supplements ||= [];draft.modifierGroupIds ||= [];
        draft.mandatoryChoices=draft.mandatoryChoices.map(group=>({...group,type:group.type||'radio',min:group.min??(group.type==='checkbox'?0:1),max:group.type==='radio'||!group.type?1:group.max??0,options:(group.options||[]).map(row=>({...row,price:row.price??0}))}));
        baseline=fingerprint(draft);file=null;section='basic';renderEditor();dialogs['item-editor'].showModal();
    }
    function tab(label,id,glyph){return `<button type="button" data-menu-action="editor-tab" data-tab="${id}" aria-pressed="${section===id}">${icon(glyph)}${label}</button>`;}
    function renderEditor() {
        if(!draft)return;
        $('item-editor-title').textContent=expected?'Modifier le produit':'Nouveau produit';
        body('item-editor').innerHTML=`<nav class="menu-editor-tabs" aria-label="Sections du produit">${tab('Informations','basic','note')}${tab('Choix','choices','sliders')}${tab('Suppléments','extras','plus')}${tab('Publication','publish','check')}${tab('Aperçu','preview','external-link')}</nav><div id="menu-product-errors" class="menu-inline-error" role="alert" hidden></div><form id="item-form" novalidate><section data-editor-panel="basic" ${section!=='basic'?'hidden':''}><h3>${icon('note')}Informations du produit</h3><p class="menu-help">Les informations visibles sur votre carte.</p>${field('Nom du produit','input-name',input('input-name',draft.name,'text','autocomplete="off" required maxlength="160"'))}${field('Description','input-desc',`<textarea id="input-desc" name="description" rows="3" maxlength="1500">${e(draft.description)}</textarea>`)}<div class="menu-field-pair">${field('Catégorie','input-category',`<select id="input-category">${option('','Choisir une catégorie')}${data.categories.map(row=>option(row.id,row.name,row.id===draft.categoryId)).join('')}</select>`)}${field('Prix de base (DH)','input-price',input('input-price',draft.price,'number','min="0" max="1000000" step="0.01" inputmode="decimal"'))}</div><div class="menu-image-editor"><img id="menu-image-preview" src="${e(objectURL||safeImage(draft.imageUrl))}" width="120" height="100" alt="Aperçu du produit">${field('Image JPG, PNG ou WebP · 5 Mo maximum','menu-image-file','<input id="menu-image-file" type="file" accept="image/jpeg,image/png,image/webp">')}${button('Retirer l’image','remove-image','x')}<p id="menu-upload-progress" role="status"></p></div></section><section data-editor-panel="choices" ${section!=='choices'?'hidden':''}><h3>${icon('sliders')}Choix du client</h3><p class="menu-help">Minimum 0 : facultatif. Maximum 0 : toutes les options, pour un choix multiple.</p><div id="container-choices">${draft.mandatoryChoices.map((group,index)=>(draft.modifierGroupIds||[]).includes(group.sourceGroupId)?'':groupEditor(group,index)).join('')}</div>${button('Ajouter un groupe indépendant','add-choice','plus')}<div class="menu-shared-attach"><h4>Réutiliser un groupe partagé</h4><select id="menu-attach-group" aria-label="Groupe à lier">${data.modifierGroups.filter(group=>!(draft.modifierGroupIds||[]).includes(group.id)).map(group=>option(group.id,`${group.title} · ${group.kind==='supplements'?'suppléments':'choix'}`)).join('')}</select>${button('Lier au produit','attach-group','sliders')}<div>${(draft.modifierGroupIds||[]).map((id,index)=>{const group=data.modifierGroups.find(row=>row.id===id);return `<div class="menu-linked"><span>${icon('sliders')}${e(group?.title||'Groupe supprimé')}</span>${button('Copie indépendante','detach-group','note',`data-id="${e(id)}"`)}${button('Monter','linked-up','arrow',`data-index="${index}"`)}${button('Détacher','unlink-group','x',`data-id="${e(id)}"`)}</div>`;}).join('')}</div><p class="menu-help">Les changements partagés s’appliquent à tous les produits liés après enregistrement. Une copie indépendante reste propre à ce produit.</p></div></section><section data-editor-panel="extras" ${section!=='extras'?'hidden':''}><h3>${icon('plus')}Suppléments payants</h3><p class="menu-help">Plusieurs suppléments facultatifs peuvent être sélectionnés par le client.</p><div id="container-supplements">${draft.supplements.map((row,index)=>(draft.modifierGroupIds||[]).includes(row.sourceGroupId)?'':optionEditor(row,index,'extra')).join('')}</div>${button('Ajouter un supplément','add-extra','plus')}</section><section data-editor-panel="publish" ${section!=='publish'?'hidden':''}><h3>${icon('check')}Disponibilité et publication</h3>${check('input-available','Disponible à la commande',draft.isAvailable!==false)}<p class="menu-help">En rupture, le produit reste affiché mais ne peut plus être commandé.</p>${check('input-visible','Publié sur la carte',draft.isVisible!==false)}${check('input-popular','Afficher dans Best Seller',draft.isPopular===true)}<p class="menu-help">Le classement des produits se règle avec Monter / Descendre dans la liste. Une duplication commence masquée.</p></section><section data-editor-panel="preview" ${section!=='preview'?'hidden':''}><h3>${icon('external-link')}Aperçu local non publié</h3><div id="menu-product-preview"></div></section></form>`;
        footer('item-editor').innerHTML=`<p data-save-state role="status">${expected?'Les modifications ne sont pas encore enregistrées.':'Ce brouillon n’est pas publié.'}</p><div>${button('Annuler','close','x','data-dialog="item-editor"')}<button id="btn-save-item" class="admin-button primary" data-menu-action="save-product">${icon('check')}Enregistrer</button></div>`;
        if(section==='preview')renderPreview($('menu-product-preview'),materializeProduct(draft,data.modifierGroups));
    }
    function optionEditor(row,index,kind,groupIndex='') {
        return `<div class="menu-option-row" data-option-kind="${kind}" data-group="${groupIndex}" data-index="${index}">${field('Option','',`<input aria-label="Nom de l’option" data-option-field="name" value="${e(row.name)}" maxlength="120">`)}${field('Prix + DH','',`<input aria-label="Prix de l’option" type="number" step="0.01" min="0" inputmode="decimal" data-option-field="price" value="${e(row.price??0)}">`)}<label class="menu-option-check"><input type="checkbox" data-option-field="isAvailable" ${row.isAvailable!==false?'checked':''}>Disponible</label><div>${button('Monter','option-up','arrow',`data-kind="${kind}" data-group="${groupIndex}" data-index="${index}"`)}${button('Retirer','option-remove','x',`data-kind="${kind}" data-group="${groupIndex}" data-index="${index}"`)}</div></div>`;
    }
    function groupEditor(group,index,shared=false) {
        return `<fieldset class="menu-choice-group ${shared?'shared':''}" data-group-index="${index}"><legend>${icon('sliders')}${shared?'Configuration partagée':`Groupe ${index+1}`}</legend><div class="menu-field-pair">${field('Nom du groupe','',`<input aria-label="Nom du groupe" data-group-field="title" value="${e(group.title)}">`)}${field('Sélection','',`<select aria-label="Type de sélection" data-group-field="type">${option('radio','Choix unique',group.type==='radio')}${option('checkbox','Choix multiple',group.type==='checkbox')}</select>`)}</div><div class="menu-field-pair">${field('Minimum requis','',`<input aria-label="Minimum requis" data-group-field="min" type="number" min="0" value="${e(group.min??(group.type==='radio'?1:0))}">`)}${field('Maximum (0 = sans limite)','',`<input aria-label="Maximum" data-group-field="max" type="number" min="0" value="${e(group.max??(group.type==='radio'?1:0))}">`)}</div><div>${(group.options||[]).map((row,optionIndex)=>optionEditor(row,optionIndex,shared?'shared':'choice',index)).join('')}</div>${button('Ajouter une option','add-option','plus',`data-index="${index}" data-shared="${shared}"`)}${shared?'':button('Monter le groupe','choice-up','arrow',`data-index="${index}"`)+button('Retirer le groupe','choice-remove','x',`data-index="${index}"`)}</fieldset>`;
    }
    function syncProduct() {
        if(!draft||!$('item-form'))return;
        draft.name=$('input-name').value;draft.description=$('input-desc').value;draft.price=$('input-price').value===''?'':Number($('input-price').value);draft.categoryId=$('input-category').value;
        for(const [field,id] of [['isAvailable','input-available'],['isVisible','input-visible'],['isPopular','input-popular']])draft[field]=$(id).checked;
    }
    async function saveProduct() {
        syncProduct();const resolved=materializeProduct(draft,data.modifierGroups),issues=productIssues(resolved,data.categories);
        const errors=$('menu-product-errors');errors.hidden=!issues.length;errors.textContent=issues.map(row=>row[1]).join(' ');
        body('item-editor').querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
        if(issues.length){section=['choices','extras'].includes(issues[0][0])?issues[0][0]:'basic';body('item-editor').querySelectorAll('[data-editor-panel]').forEach(el=>el.hidden=el.dataset.editorPanel!==section);const id={name:'input-name',price:'input-price',categoryId:'input-category'}[issues[0][0]];const target=id?$(id):errors;target.setAttribute('aria-invalid','true');target.tabIndex ||= -1;target.focus();errors.scrollIntoView({block:'nearest'});return false;}
        const generation=version;
        return operation(async()=>{
            let imageUrl=draft.imageUrl||'';
            if(file){const issue=imageIssue(file);if(issue)throw Error(issue);imageUrl=await upload(file,progress=>{if(version===generation&&$('menu-upload-progress'))$('menu-upload-progress').textContent=`Envoi de l’image : ${progress}%`;});}
            if(generation!==version||!allowed())throw Error('Session changée');
            const payload={};for(const key of ['name','description','categoryId','price','isAvailable','isVisible','isPopular','mandatoryChoices','supplements','modifierGroupIds','order'])if(draft[key]!==undefined)payload[key]=copy(draft[key]);
            payload.name=payload.name.trim();payload.price=Number(payload.price);payload.imageUrl=imageUrl;
            payload.mandatoryChoices=payload.mandatoryChoices.map(group=>({...group,min:Number(group.min??(group.type==='radio'?1:0)),max:Number(group.max??(group.type==='radio'?1:0)),options:group.options.map(row=>({...row,price:Number(row.price)}))}));payload.supplements=payload.supplements.map(row=>({...row,price:Number(row.price)}));
            await service.product(payload,expected,data.categories);
        },()=>close('item-editor',true));
    }
    function openCategories(id) {
        if(!allowed()||blocked)return;categoryExpected=id?data.categories.find(row=>row.id===id)||null:null;renderCategories();dialogs['menu-categories-dialog'].showModal();
    }
    function categoryFormValue(){return dialogs['menu-categories-dialog'].open&&$('menu-category-name')?JSON.stringify([$('menu-category-name').value,$('menu-category-visible').checked]):'';}
    function renderCategories() {
        body('menu-categories-dialog').innerHTML=`<p class="menu-help">Les renommages conservent les produits. Pour supprimer une catégorie, choisissez où déplacer ses produits.</p><div class="menu-category-editor">${field(categoryExpected?'Renommer la catégorie':'Nouvelle catégorie','menu-category-name',input('menu-category-name',categoryExpected?.name||''))}${check('menu-category-visible','Afficher cette catégorie',categoryExpected?.isVisible!==false)}${button('Enregistrer la catégorie','save-category','check')}<p data-save-state role="status"></p></div><div class="menu-category-list">${data.categories.map(row=>`<article data-category-id="${e(row.id)}"><h3>${icon('grid')}${e(row.name)}</h3><p>${data.menuItems.filter(item=>categoryFor(item,data.categories)?.id===row.id).length} produit(s) · ${row.isVisible===false?'Masquée':'Visible'}</p><div>${button('Modifier','edit-category','note',`data-id="${e(row.id)}"`)}${button('Monter','category-up','arrow',`data-id="${e(row.id)}"`)}${button('Supprimer','delete-category','x',`data-id="${e(row.id)}"`)}</div><label>Déplacer les produits vers<select data-destination="${e(row.id)}"><option value="">Choisir avant suppression…</option>${data.categories.filter(cat=>cat.id!==row.id).map(cat=>option(cat.id,cat.name)).join('')}</select></label></article>`).join('')}</div>`;
        footer('menu-categories-dialog').innerHTML=button('Terminé','close','check','data-dialog="menu-categories-dialog"');
        categoryBaseline=JSON.stringify([categoryExpected?.name||'',categoryExpected?.isVisible!==false]);
    }
    function openGroups() {
        if(!allowed()||blocked)return;
        body('menu-groups-dialog').innerHTML=`<div class="menu-library-intro">${icon('sliders')}Créez une fois vos sauces, viandes ou suppléments, puis liez-les aux produits.</div>${button('Créer un groupe','new-group','plus')}<div class="menu-library">${data.modifierGroups.map(group=>`<article><h3>${icon('sliders')}${e(group.title)}</h3><p>${group.options.length} options · ${(group.productIds||[]).length} produit(s) lié(s)</p><div>${button('Modifier le groupe partagé','edit-group','note',`data-id="${e(group.id)}"`)}${button('Dupliquer','duplicate-group','plus',`data-id="${e(group.id)}"`)}${button('Supprimer et détacher','delete-group','x',`data-id="${e(group.id)}"`)}</div></article>`).join('')||'<p class="menu-empty">Aucun groupe partagé. Les choix existants restent dans chaque produit.</p>'}</div>`;
        footer('menu-groups-dialog').innerHTML=button('Terminé','close','check','data-dialog="menu-groups-dialog"');dialogs['menu-groups-dialog'].showModal();
    }
    function openGroup(id,duplicate=false) {
        const source=data.modifierGroups.find(row=>row.id===id);groupExpected=duplicate?null:source||null;groupDraft=source?copy(source):{title:'',type:'radio',min:1,max:1,kind:'choice',options:[{id:newId(),name:'',price:0,isAvailable:true}]};
        if(duplicate){delete groupDraft.id;groupDraft.productIds=[];groupDraft.title+=' (copie)';groupDraft.options=groupDraft.options.map(option=>({...option,id:newId()}));}
        groupBaseline=fingerprint(groupDraft);renderGroup();dialogs['menu-group-editor'].showModal();
    }
    function renderGroup(){body('menu-group-editor').innerHTML=`<p class="menu-library-intro">${icon('sliders')}${groupExpected?`${(groupExpected.productIds||[]).length} produit(s) lié(s) seront mis à jour ensemble.`:'Groupe réutilisable indépendant.'}</p><div id="menu-group-error" role="alert" hidden></div>${field('Usage du groupe','menu-group-kind',`<select id="menu-group-kind">${option('choice','Choix du client',groupDraft.kind!=='supplements')}${option('supplements','Suppléments facultatifs',groupDraft.kind==='supplements')}</select>`)}${groupEditor(groupDraft,0,true)}`;footer('menu-group-editor').innerHTML=`<p data-save-state role="status"></p>${button('Annuler','close','x','data-dialog="menu-group-editor"')}<button class="admin-button primary" data-menu-action="save-group">${icon('check')}Enregistrer le groupe</button>`;}
    function renderPreview(container,product) {
        const steps=buildCustomizationSteps(product);previewSelections={};
        container.innerHTML=`<p class="menu-help">Simulation locale : aucun produit ni commande n’est publié.</p><article class="menu-customer-preview"><img src="${e(objectURL||safeImage(product.imageUrl))}" alt="" width="320" height="180"><div><h3>${e(product.name||'Nom du produit')}</h3><p>${e(product.description)}</p><strong>${money(product.price)}</strong><span class="menu-badge ${product.isAvailable===false?'amber':'green'}">${product.isAvailable===false?'Rupture de stock':'Disponible'}</span></div></article>${steps.map((step,index)=>{const rules=choiceRules(step);return `<fieldset class="menu-preview-step"><legend>${e(step.title)} · ${rules.min?`au moins ${rules.min}`:'facultatif'} · max ${rules.max}</legend>${rules.options.map((row,i)=>`<label><input type="${rules.radio?'radio':'checkbox'}" name="preview-${index}" data-preview-step="${index}" data-preview-option="${i}">${e(row.name)} <span>+ ${money(row.price)}</span></label>`).join('')}</fieldset>`;}).join('')}<p id="menu-preview-issue" role="status"></p><strong id="menu-preview-total">Total : ${money(product.price)}</strong>`;
        container.onchange=event=>{const el=event.target;if(!el.dataset.previewStep)return;const index=Number(el.dataset.previewStep),rules=choiceRules(steps[index]),row=rules.options[Number(el.dataset.previewOption)],current=previewSelections[index]||[];if(el.checked&&!rules.radio&&current.length>=rules.max){el.checked=false;$('menu-preview-issue').textContent=`Maximum ${rules.max} option(s).`;return;}previewSelections[index]=rules.radio?[row]:el.checked?[...current,row]:current.filter(value=>value!==row);$('menu-preview-total').textContent=`Total : ${money(customizationPrice(product,previewSelections))}`;$('menu-preview-issue').textContent=steps.map((step,i)=>selectionIssue(step,previewSelections[i])).find(Boolean)||'Choix complets. Aucun ajout au panier dans cet aperçu.';};
    }
    function move(rows,index,direction){if(index<0||index+direction<0||index+direction>=rows.length)return;[rows[index],rows[index+direction]]=[rows[index+direction],rows[index]];}
    function editField(event) {
        if(event.target.closest('#item-form'))syncProduct();
        const row=event.target.closest('[data-option-kind]'),group=event.target.closest('[data-group-index]');
        if(row&&event.target.dataset.optionField){const target=row.dataset.optionKind==='shared'?groupDraft.options:row.dataset.optionKind==='extra'?draft.supplements:draft.mandatoryChoices[Number(row.dataset.group)].options;target[Number(row.dataset.index)][event.target.dataset.optionField]=event.target.type==='checkbox'?event.target.checked:event.target.value;}
        else if(group&&event.target.dataset.groupField){const target=event.target.closest('#menu-group-editor')?groupDraft:draft.mandatoryChoices[Number(group.dataset.groupIndex)];target[event.target.dataset.groupField]=event.target.value;}
        if(event.target.id==='menu-group-kind'){groupDraft.kind=event.target.value;if(groupDraft.kind==='supplements'){groupDraft.type='checkbox';groupDraft.min=0;groupDraft.max=0;}renderGroup();}
        if(event.target.closest('#item-form')) {
            event.target.removeAttribute('aria-invalid');
            const errors=$('menu-product-errors');
            if(errors&&!errors.hidden&&!productIssues(materializeProduct(draft,data.modifierGroups),data.categories).length)errors.hidden=true;
        }
    }
    async function handle(event) {
        const target=event.target.closest('[data-menu-action]');if(!target||target.disabled||!allowed())return;
        const action=target.dataset.menuAction,id=target.dataset.id,index=Number(target.dataset.index),item=data.menuItems.find(row=>row.id===id);
        if(action==='close')return close(target.dataset.dialog);
        if(action==='new')return openProduct();if(action==='edit')return openProduct(id);if(action==='duplicate')return openProduct(id,true);
        if(action==='filter'){category=target.dataset.category;return paint();}if(action==='clear'){selected.clear();return paint();}
        if(action==='refresh')return api.start(true);if(action==='categories')return openCategories();if(action==='groups')return sharedReady?openGroups():toast('Les groupes partagés ne sont pas disponibles. Faites vérifier leurs autorisations.','error');
        if(action==='stock'||action==='visibility')return operation(()=>service.bulk([item],action==='stock'?{isAvailable:item.isAvailable===false}:{isVisible:item.isVisible===false}));
        if(action==='bulk'){const rows=data.menuItems.filter(row=>selected.has(row.id)),kind=$('menu-bulk-action').value;if(!confirm(`Appliquer cette modification à ${rows.length} produit(s) ?`))return;const patch=kind==='move'?{categoryId:$('menu-bulk-category').value}:kind==='stock'||kind==='available'?{isAvailable:kind==='available'}:{isVisible:kind==='show'};if(kind==='move'&&!patch.categoryId)return toast('Choisissez une catégorie.','error');return operation(()=>service.bulk(rows,patch),()=>selected.clear());}
        if(action==='up'||action==='down'){const rows=ordered(data.menuItems);move(rows,rows.findIndex(row=>row.id===id),action==='up'?-1:1);return operation(()=>service.reorder('menuItems',rows));}
        if(action==='editor-tab'){syncProduct();section=target.dataset.tab;return renderEditor();}if(action==='save-product')return saveProduct();
        if(action==='remove-image'){draft.imageUrl='';file=null;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;return renderEditor();}
        if(action==='add-choice'){draft.mandatoryChoices.push({title:'',type:'radio',min:1,max:1,options:[{id:newId(),name:'',price:0,isAvailable:true}]});return renderEditor();}
        if(action==='add-extra'){draft.supplements.push({id:newId(),name:'',price:0,isAvailable:true});return renderEditor();}
        if(action==='add-option'){const options=target.dataset.shared==='true'?groupDraft.options:draft.mandatoryChoices[index].options;options.push({id:newId(),name:'',price:0,isAvailable:true});return target.dataset.shared==='true'?renderGroup():renderEditor();}
        if(action==='choice-remove'||action==='choice-up'){if(action==='choice-remove')draft.mandatoryChoices.splice(index,1);else move(draft.mandatoryChoices,index,-1);return renderEditor();}
        if(action==='option-up'||action==='option-remove'){const options=target.dataset.kind==='shared'?groupDraft.options:target.dataset.kind==='extra'?draft.supplements:draft.mandatoryChoices[Number(target.dataset.group)].options;if(action==='option-remove')options.splice(index,1);else move(options,index,-1);return target.dataset.kind==='shared'?renderGroup():renderEditor();}
        if(action==='attach-group'){const groupId=$('menu-attach-group').value;if(!groupId)return;draft.modifierGroupIds.push(groupId);return renderEditor();}
        if(action==='linked-up'){move(draft.modifierGroupIds,index,-1);return renderEditor();}
        if(action==='detach-group'||action==='unlink-group'){if(action==='detach-group'){const resolved=materializeProduct({mandatoryChoices:draft.mandatoryChoices.filter(row=>row.sourceGroupId===id),supplements:draft.supplements.filter(row=>row.sourceGroupId===id),modifierGroupIds:[id]},data.modifierGroups);draft.mandatoryChoices.push(...resolved.mandatoryChoices.map(({sourceGroupId,...row})=>row));draft.supplements.push(...resolved.supplements.map(({sourceGroupId,...row})=>row));}draft.modifierGroupIds=draft.modifierGroupIds.filter(value=>value!==id);draft.mandatoryChoices=draft.mandatoryChoices.filter(row=>row.sourceGroupId!==id);draft.supplements=draft.supplements.filter(row=>row.sourceGroupId!==id);return renderEditor();}
        if(action==='save-category'){const name=$('menu-category-name').value.trim();if(!name)return toast('Donnez un nom à la catégorie.','error');const payload={name,isVisible:$('menu-category-visible').checked,order:categoryExpected?.order??Math.max(-1,...data.categories.map(row=>Number(row.order)||0))+1};return operation(()=>service.category(payload,categoryExpected,data.menuItems,data.categories),()=>{categoryExpected=null;renderCategories();});}
        if(action==='edit-category'){if(categoryFormValue()!==categoryBaseline&&!confirm('Abandonner les modifications de cette catégorie ?'))return;categoryExpected=data.categories.find(row=>row.id===id);return renderCategories();}
        if(action==='delete-category'){const row=data.categories.find(row=>row.id===id),destination=body('menu-categories-dialog').querySelector(`[data-destination="${CSS.escape(id)}"]`).value;if(!confirm(`Supprimer ${row.name} et déplacer ses produits vers la destination choisie ?`))return;return operation(()=>service.category(null,row,data.menuItems,data.categories,{remove:true,targetId:destination}),()=>{categoryExpected=null;renderCategories();});}
        if(action==='category-up'){const rows=ordered(data.categories);move(rows,rows.findIndex(row=>row.id===id),-1);return operation(()=>service.reorder('categories',rows),renderCategories);}
        if(action==='new-group')return openGroup();if(action==='edit-group')return openGroup(id);if(action==='duplicate-group')return openGroup(id,true);
        if(action==='delete-group'){const group=data.modifierGroups.find(row=>row.id===id);if(!confirm(`Supprimer ${group.title} ? Les ${(group.productIds||[]).length} produits liés conserveront une copie indépendante de leurs choix.`))return;return operation(()=>service.group(null,group,{remove:true}),()=>{dialogs['menu-groups-dialog'].close();openGroups();});}
        if(action==='save-group'){const issues=groupIssues(groupDraft);if(issues.length){$('menu-group-error').hidden=false;$('menu-group-error').textContent=issues.join(' ');return;}
            if(groupExpected?.productIds?.length&&!confirm(`Mettre à jour les ${groupExpected.productIds.length} produits liés à ce groupe ?`))return;
            const payload={title:groupDraft.title.trim(),type:groupDraft.type,min:Number(groupDraft.min),max:Number(groupDraft.max),kind:groupDraft.kind||'choice',options:groupDraft.options.map(row=>({...row,price:Number(row.price)}))};return operation(()=>service.group(payload,groupExpected),()=>{close('menu-group-editor',true);dialogs['menu-groups-dialog'].close();openGroups();});}
    }
    root.addEventListener('click',handle);Object.values(dialogs).forEach(dialog=>{dialog.addEventListener('click',handle);dialog.addEventListener('input',editField);dialog.addEventListener('change',event=>{
        editField(event);if(event.target.id==='menu-image-file'){
            const next=event.target.files[0],issue=imageIssue(next);if(issue){event.target.value='';toast(issue,'error');return;}file=next;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);$('menu-image-preview').src=objectURL;
        }
    });});
    root.addEventListener('input',event=>{if(event.target.id==='menu-admin-search'){search=event.target.value;paint();}});
    root.addEventListener('change',event=>{if(event.target.id==='menu-state'){state=event.target.value;paint();}if(event.target.dataset.select){event.target.checked?selected.add(event.target.dataset.select):selected.delete(event.target.dataset.select);paint();}});
    window.addEventListener('beforeunload',event=>{if(isDirty()||groupDraft&&dialogs['menu-group-editor'].open&&fingerprint(groupDraft)!==groupBaseline){event.preventDefault();event.returnValue='';}});
    const api={
        start(force=false){
            if(!session()||!['admin','manager'].includes(session().role))return Promise.resolve();if(running&&!force)return Promise.resolve();
            stops.forEach(stop=>stop());stops=[];running=true;const generation=++version;loading=true;blocked=true;readError='';paint();
            const states={};return Promise.all(['categories','menuItems','modifierGroups'].map(name=>new Promise(resolve=>{
                const receive=result=>{if(generation!==version)return;data[name]=result.rows.slice(0,MENU_LIMIT);states[name]=result;if(name==='modifierGroups')sharedReady=!result.error&&!result.cached&&!result.partial;loading=Object.keys(states).length<3;blocked=loading||Object.entries(states).some(([key,value])=>key!=='modifierGroups'&&(value.cached||value.partial||value.error));paint();resolve();};
                stops.push(watchMenu(name,receive,()=>{readError='Impossible de vérifier toute la carte. Actualisez ou faites vérifier vos autorisations.';receive({rows:data[name],error:true});}));
            })));
        },
        stop(){running=false;version++;stops.forEach(stop=>stop());stops=[];Object.keys(dialogs).forEach(id=>close(id,true));data={menuItems:[],categories:[],modifierGroups:[]};selected.clear();draft=groupDraft=null;busy=false;},
        canLeave(){if(busy)return false;return !(isDirty()||dialogs['menu-group-editor'].open&&fingerprint(groupDraft)!==groupBaseline||dialogs['menu-categories-dialog'].open&&categoryFormValue()!==categoryBaseline)||confirm('Quitter la carte sans enregistrer les modifications ?');},
        openProduct,saveProduct,openCategories,
        filter(name){category=data.categories.find(row=>row.name===name)?.id||'all';paint();}
    };
    return api;
}
