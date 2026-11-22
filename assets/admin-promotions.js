import {db,doc,getDoc,collection,query,onSnapshot} from '../firebase-config.js';
import {limit} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {operationsService} from './operations-service.js';
import {offerIssues,promotionState,stateLabels,localInstant,localInput,validZone,cents,compareOfferOrder} from './operations-model.js';
import {copy,newId,imageIssue,groupIssues,selectionPresets,selectionPreset,selectionSummary,applySelectionPreset} from './menu-model.js';
import {icon} from './admin-icons.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createPromotions({session,toast,upload,settings}){
    const service=operationsService(session),$=id=>document.getElementById(id);let stop=null,timer=null,rows=[],expected=null,groups=[],extras=[],busy=false,blocked=true,epoch=0;
    const feedback=document.createElement('p');feedback.id='promo-feedback';feedback.setAttribute('role','status');$('promotions-list').before(feedback);
    const schedule=document.createElement('section');schedule.className='promo-schedule';schedule.dataset.promoPanel='publish';schedule.hidden=true;schedule.innerHTML='<h4>Publication et calendrier</h4><p>Choisissez la visibilité et les dates de votre offre.</p><label class="editor-publication"><input type="checkbox" id="promo-visible" checked><span>Publié sur la carte</span></label><p>Dates facultatives · fuseau du restaurant</p><label>Début<input id="promo-start" name="promotion-start" type="datetime-local" class="w-full p-3 border rounded-xl"></label><label>Fin<input id="promo-end" name="promotion-end" type="datetime-local" class="w-full p-3 border rounded-xl"></label>';$('promo-form').append(schedule);
    let baseline=null;
    const editorValue=()=>JSON.stringify([...$('promo-form').querySelectorAll('input,select:not([data-preset]),textarea')].map(field=>field.type==='file'?[...field.files].map(file=>[file.name,file.size,file.lastModified]):field.type==='checkbox'?field.checked:field.value));
    const isDirty=()=>!$('promo-editor').classList.contains('hidden')&&baseline!==null&&editorValue()!==baseline;
    const canLeave=()=>!busy&&(!isDirty()||confirm('Quitter sans enregistrer les modifications ?'));
    window.addEventListener('beforeunload',event=>{if(isDirty()){event.preventDefault();event.returnValue='';}});
    const allowed=()=>['admin','manager'].includes(session()?.role);
    const zone=()=>validZone(settings()?.reportingTimezone)?settings().reportingTimezone:'Africa/Casablanca';
    function switchSection(section){
        for(const panel of $('promo-form').querySelectorAll('[data-promo-panel]'))panel.hidden=panel.dataset.promoPanel!==section;
        const nav=$('promo-editor').querySelector('.promo-section-tabs');
        for(const tab of nav.querySelectorAll('button'))tab.setAttribute('aria-pressed',String(tab.id==='promo-tab-'+section));
        const active=$('promo-tab-'+section),rail=nav.getBoundingClientRect(),rect=active.getBoundingClientRect();
        nav.scrollLeft+=rect.left<rail.left?rect.left-rail.left:Math.max(0,rect.right-rail.right);
        $('promo-editor').querySelector('.overflow-y-auto').scrollTop=0;
    }
    function clearError(){
        $('promo-edit-error').hidden=true;$('promo-edit-error').textContent='';
        $('promo-form').querySelectorAll('.editor-field-error').forEach(el=>el.remove());
        $('promo-form').querySelectorAll('[aria-invalid]').forEach(el=>{el.removeAttribute('aria-invalid');const description=(el.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!=='promo-field-error').join(' ');if(description)el.setAttribute('aria-describedby',description);else el.removeAttribute('aria-describedby');});
    }
    function showError(message,target=null){
        clearError();const error=$('promo-edit-error');error.hidden=!!target;error.textContent=message;
        if(target){
            switchSection(target.closest('[data-promo-panel]').dataset.promoPanel);
            const inline=document.createElement('p');inline.id='promo-field-error';inline.className='editor-field-error';inline.textContent=message;
            (target.closest('.promo-identity-fields')||target).after(inline);target.setAttribute('aria-invalid','true');target.setAttribute('aria-describedby',[target.getAttribute('aria-describedby'),inline.id].filter(Boolean).join(' '));
        }
        const focus=target||error;focus.focus({preventScroll:true});focus.scrollIntoView({block:'center'});
    }
    function invalidTarget(patch){
        if(!patch.name)return $('promo-name');
        try{cents(patch.price);}catch{return $('promo-price');}
        if(promotionState({...patch,isVisible:true})==='invalid')return $('promo-end');
        const index=groups.findIndex(group=>groupIssues(group).length);
        const container=index>=0?$('promo-container-choices').children[index]:$('promo-container-supplements');
        const fields=[...container.querySelectorAll('input,select')];
        const field=fields.find(el=>!el.checkValidity()||el.type==='text'&&!el.value.trim())||fields[0]||null;
        const details=field?.closest('details');
        if(details)details.open=true;
        return field;
    }
    let previewURL=null;
    function updatePhotoCaption(){
        const caption=$('promo-photo-caption'),name=$('promo-name').value.trim(),price=$('promo-price').value;
        caption.hidden=!name&&!price;
        caption.querySelector('strong').textContent=name;
        caption.querySelector('span').textContent=price?`${price} DH`:'';
    }
    function photoState(){
        updatePhotoCaption();
        const selected=$('promo-image-file').files[0],hasPhoto=!!(selected||$('promo-image-url').value);
        if(!selected){
            if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;$('promo-image-preview').replaceChildren();
            if($('promo-image-url').value){const image=document.createElement('img');image.src=$('promo-image-url').value;image.alt='Aperçu de la promotion';$('promo-image-preview').append(image);}
        }
        $('promo-photo-button').textContent=hasPhoto?'Remplacer la photo':'Ajouter une photo';
        $('promo-photo-frame').setAttribute('aria-label',hasPhoto?'Remplacer la photo de la promotion':'Ajouter la photo de la promotion');
        $('promo-photo-filename').textContent=selected?.name||(hasPhoto?'Photo actuelle':'Aucun fichier sélectionné');
    }
    $('promo-image-file').addEventListener('change',()=>{
        const file=$('promo-image-file').files[0];if(!file)return;
        const issue=imageIssue(file);if(issue){$('promo-image-file').value='';photoState();showError(issue,$('promo-image-file'));return;}
        clearError();if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);
        const image=document.createElement('img');image.src=previewURL;image.alt='Aperçu de la promotion';$('promo-image-preview').replaceChildren(image);photoState();
    });
    $('promo-form').addEventListener('input',event=>{
        if(event.target.hasAttribute('aria-invalid'))clearError();
        if(event.target.matches('#promo-name,#promo-price'))updatePhotoCaption();
    });
    function render(){
        const labels=[...rows].sort(compareOfferOrder).map(p=>{
            const state=promotionState(p);
            const dateText=value=>e(localInput(value,zone()).replace('T',' · '));
            const actions=[['edit','Modifier','edit'],['duplicate','Copier','copy'],['toggle',p.isVisible===false?'Activer':'Désactiver',p.isVisible===false?'check':'off'],['delete','Supprimer','trash']];
            return `<article class="promo-entry">
                <div class="promo-art">${p.imageUrl?`<img src="${e(p.imageUrl)}" alt="" loading="lazy">`:icon('image')}</div>
                <div class="promo-entry-body">
                    <span class="promo-entry-state" data-state="${e(state)}">${e(stateLabels[state])}</span>
                    <h3>${e(p.name)}</h3>
                    ${p.description?`<p class="promo-entry-description">${e(p.description)}</p>`:''}
                    ${p.startsAt||p.endsAt?`<p class="promo-entry-schedule">${icon('clock')}<span>${[p.startsAt?'Début : '+dateText(p.startsAt):'',p.endsAt?'Fin : '+dateText(p.endsAt):''].filter(Boolean).join(' / ')}</span></p>`:''}
                </div>
                <strong class="promo-entry-price">${e(p.price)} <small>DH</small></strong>
                <div class="promo-actions">${actions.map(([action,label,glyph])=>`<button type="button" class="admin-button" data-promo-action="${action}" data-id="${e(p.id)}" aria-label="${e(label)}" title="${e(label)}" ${busy||blocked?'disabled':''}>${icon(glyph)}<span class="sr-only">${label}</span></button>`).join('')}</div>
            </article>`;
        });
        $('promotions-list').innerHTML=labels.join('')||(blocked?'':'<div class="menu-empty"><h3>Aucune offre enregistrée.</h3></div>');
    }
    function draw(){
        const option=(o,path)=>`<div class="promo-option-fields"><label>Option<input aria-label="Nom de l’option" class="p-2 border rounded-xl min-w-0" data-pfield="${path}.name" value="${e(o.name)}"></label><label>Prix + DH<input aria-label="Prix de l’option" class="p-2 border rounded-xl w-24" type="number" min="0" step="0.01" data-pfield="${path}.price" value="${e(o.price)}"></label></div>`;
        $('promo-container-choices').innerHTML=groups.map((g,i)=>`<fieldset class="menu-choice-group" data-promo-group="${i}">
            <legend>Groupe ${i+1}</legend>
            <div class="menu-group-config">
                <label>Nom du groupe<input data-pfield="g.${i}.title" value="${e(g.title)}"></label>
                <label>Règle de sélection<select data-preset="${i}">${selectionPresets.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
            </div>
            <p class="menu-rule-summary" data-rule-summary></p>
            <details class="menu-rule-details"><summary>Ajuster</summary><div class="menu-rule-fields">
                <label>Type de choix<select data-pfield="g.${i}.type"><option value="radio" ${g.type==='radio'?'selected':''}>Choix unique</option><option value="checkbox" ${g.type==='checkbox'?'selected':''}>Choix multiple</option></select></label>
                <label>Minimum requis<input type="number" min="0" data-pfield="g.${i}.min" value="${e(g.min)}"></label>
                <label>Maximum<input type="number" min="0" data-pfield="g.${i}.max" value="${e(g.max)}"></label>
            </div><p class="menu-help">Minimum 0 : facultatif. Maximum 0 : toutes les options, pour un choix multiple.</p></details>
            <div class="menu-group-options">${(g.options||[]).map((o,j)=>`<div class="promo-choice-option">${option(o,`g.${i}.options.${j}`)}<button type="button" class="admin-button" aria-label="Retirer l’option ${e(o.name||j+1)}" data-pedit="option-remove" data-i="${i}" data-j="${j}">${icon('trash')}</button></div>`).join('')}</div>
            <div class="menu-group-footer"><button type="button" class="admin-button" data-pedit="option" data-i="${i}">Ajouter une option</button><button type="button" class="admin-button" aria-label="Retirer le groupe ${i+1}" data-pedit="remove" data-i="${i}">${icon('trash')}</button></div>
        </fieldset>`).join('');
        groups.forEach((group,i)=>updateRule($('promo-container-choices').children[i],group));
        $('promo-container-supplements').innerHTML=extras.map((o,i)=>`<div>${option(o,`s.${i}`)}<button type="button" data-pedit="extra-remove" data-i="${i}">Retirer</button></div>`).join('');
    }
    function updateRule(panel,group){
        panel.querySelector('[data-preset]').value=group.type==='radio'&&Number(group.min??1)===0?'custom':selectionPreset(group);
        panel.querySelector('[data-rule-summary]').textContent=selectionSummary(group);
    }
    $('promo-editor').addEventListener('input',({target:field})=>{
        const path=field.dataset.pfield?.split('.');if(!path)return;
        let target=path.shift()==='g'?groups:extras;
        const key=path.pop();for(const part of path)target=target[part];target[key]=field.value;
        const panel=field.closest('[data-promo-group]');
        if(panel&&['type','min','max'].includes(key)){
            if(key==='type'&&target.type==='radio'){
                target.max=1;
                panel.querySelector('[data-pfield$=".max"]').value=1;
            }
            updateRule(panel,target);
        }
    });
    $('promo-editor').addEventListener('change',({target:field})=>{
        if(!field.matches('[data-preset]'))return;
        const panel=field.closest('[data-promo-group]'),group=groups[Number(field.dataset.preset)];
        if(field.value==='custom'){panel.querySelector('details').open=true;return;}
        Object.assign(group,applySelectionPreset(group,field.value));
        for(const key of ['type','min','max'])panel.querySelector(`[data-pfield$=".${key}"]`).value=group[key];
        updateRule(panel,group);
        panel.querySelector('details').open=group.type!=='radio';
    });
    $('promo-editor').addEventListener('click',event=>{
        const b=event.target.closest('[data-pedit]');if(!b)return;
        const i=Number(b.dataset.i),action=b.dataset.pedit;
        if(action==='option')groups[i].options.push({name:'',price:0});
        if(action==='remove')groups.splice(i,1);
        if(action==='option-remove')groups[i].options.splice(Number(b.dataset.j),1);
        if(action==='extra-remove')extras.splice(i,1);
        draw();
        if(action==='option')$('promo-container-choices').querySelector(`[data-pfield="g.${i}.options.${groups[i].options.length-1}.name"]`)?.focus();
    });
    window.addPromoChoiceGroup=()=>{
        const index=groups.length;
        groups.push({title:'',type:'radio',min:1,max:1,options:[{name:'',price:0}]});
        draw();
        if($('promo-panel-choices').hidden)switchSection('choices');
        $('promo-container-choices').querySelector(`[data-pfield="g.${index}.title"]`)?.focus();
    };
    window.addPromoSupplementRow=()=>{extras.push({name:'',price:0});draw();switchSection('supplements');};
    async function open(id){
        if(!allowed()||blocked){toast('Rechargez les offres avant de modifier.','error');return;}
        if(!canLeave())return;
        const version=++epoch;$('promo-form').reset();$('promo-image-url').value='';expected=null;groups=[];extras=[];draw();clearError();$('edit-promo-id').value=id||'';$('promo-image-preview').replaceChildren();photoState();$('promo-editor').classList.remove('hidden');switchSection('basic');$('btn-save-promo').disabled=!!id;
        baseline=editorValue();
        if(id)try{const snap=await getDoc(doc(db,'promotions',id));if(version!==epoch||!allowed())return;if(!snap.exists()||snap.metadata?.fromCache)throw Error('Offre introuvable ou non confirmée.');expected={...snap.data(),id};for(const [field,key]of [['promo-name','name'],['promo-price','price'],['promo-desc','description'],['promo-image-url','imageUrl']])$(field).value=expected[key]??'';$('promo-visible').checked=expected.isVisible!==false;$('promo-start').value=localInput(expected.startsAt,zone());$('promo-end').value=localInput(expected.endsAt,zone());groups=copy(expected.mandatoryChoices||[]);extras=copy(expected.supplements||[]);draw();photoState();}catch(error){showError(error.message);return;}
        if(version===epoch){baseline=editorValue();$('promo-editor-title').textContent=id?'Modifier la promotion':'Nouvelle promotion';$('btn-save-promo').disabled=false;}
    }
    function close(force=false){if(!force&&!canLeave())return false;++epoch;$('promo-editor').classList.add('hidden');if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;expected=null;baseline=null;return true;}
    async function save(){
        if(busy||blocked||!allowed())return;busy=true;$('btn-save-promo').disabled=true;const version=epoch,actor=session();let errorTarget=null;clearError();
        try{
            let imageUrl=$('promo-image-url').value;const file=$('promo-image-file').files[0];if(file){errorTarget=$('promo-image-file');const issue=imageIssue(file);if(issue)throw Error(issue);imageUrl=await upload(file);}
            if(version!==epoch||session()?.uid!==actor.uid||session()?.epoch!==actor.epoch)throw Error('Votre session a changé.');
            errorTarget=$('promo-start');const startsAt=localInstant($('promo-start').value,zone());errorTarget=$('promo-end');const endsAt=localInstant($('promo-end').value,zone());
            const patch={name:$('promo-name').value.trim(),price:$('promo-price').value,description:$('promo-desc').value.trim(),imageUrl,isVisible:$('promo-visible').checked,mandatoryChoices:copy(groups),supplements:copy(extras),startsAt,endsAt};
            const issues=offerIssues(patch);if(issues.length){errorTarget=invalidTarget(patch);throw Error(issues[0]);}errorTarget=null;patch.price=Number(patch.price);patch.mandatoryChoices.forEach(g=>{g.min=Number(g.min);g.max=Number(g.max);g.options.forEach(o=>o.price=Number(o.price));});patch.supplements.forEach(o=>o.price=Number(o.price));
            await service.offer({id:expected?.id||newId(),patch,expected});toast('Offre enregistrée.');busy=false;close(true);
        }catch(error){if(version===epoch){showError(error.message,errorTarget);if(!errorTarget)toast(error.message,'error');}}finally{busy=false;$('btn-save-promo').disabled=false;render();}
    }
    $('promotions-list').addEventListener('click',async event=>{const b=event.target.closest('[data-promo-action]');if(!b||busy||blocked||!allowed())return;const p=rows.find(row=>row.id===b.dataset.id);if(!p)return;if(b.dataset.promoAction==='edit')return open(p.id);if(b.dataset.promoAction==='delete'&&!confirm('Supprimer cette offre ? Les commandes passées restent inchangées.'))return;busy=true;render();try{if(b.dataset.promoAction==='duplicate'){const patch=copy(p);delete patch.id;patch.name+=' (copie)';patch.isVisible=false;await service.offer({id:newId(),patch});}else await service.offer({id:p.id,expected:p,remove:b.dataset.promoAction==='delete',patch:{isVisible:p.isVisible===false}});toast('Offre mise à jour.');}catch(error){toast(error.message,'error');}finally{busy=false;render();}});
    function start(){if(stop)return;blocked=true;feedback.textContent='Chargement…';stop=onSnapshot(query(collection(db,'promotions'),limit(301)),{includeMetadataChanges:true},snap=>{blocked=!!(snap.metadata?.fromCache||snap.metadata?.hasPendingWrites)||snap.docs.length>300;rows=snap.docs.slice(0,300).map(d=>({...d.data(),id:d.id}));feedback.textContent=blocked?'Offres non confirmées ou liste partielle. Édition indisponible.':'Offres synchronisées.';render();},()=>{blocked=true;feedback.innerHTML='Lecture impossible. <button class="admin-button" id="promo-retry">Réessayer</button>';$('promo-retry').onclick=()=>{stop?.();stop=null;start();};render();});timer=setInterval(render,30000);}
    return {start,stop(){++epoch;stop?.();stop=null;clearInterval(timer);blocked=true;close(true);},open,save,close,canLeave,switchSection};
}
