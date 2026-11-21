import {operationsService} from './operations-service.js';
import {settingsIssues} from './operations-model.js';
import {copy,imageIssue} from './menu-model.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createSettingsEditor({session,upload,toast}){
    const service=operationsService(session),root=document.createElement('form');root.id='restaurant-profile-form';root.className='settings-profile';
    const servicePanel=document.querySelector('.admin-settings-panel');
    servicePanel.insertAdjacentHTML('afterbegin','<h3>Service en cours</h3>');
    servicePanel.after(root);
    servicePanel.id = 'settings-service';
    const jump = document.createElement('label');
    jump.className = 'settings-jump';
    jump.innerHTML = '<select aria-label="Aller à une section des paramètres"><option value="" data-i18n="admin.select_section">Aller à une section…</option><option value="settings-service" data-i18n="admin.shift">Service en cours</option><option value="settings-identity" data-i18n="admin.identity">Identité du restaurant</option><option value="settings-contact" data-i18n="admin.contact">Contact et adresse</option><option value="settings-links" data-i18n="admin.service_settings">Liens et service</option><option value="settings-weekly-hours" data-i18n="admin.hours">Horaires hebdomadaires</option></select>';
    document.querySelector('#view-settings .admin-page-heading').append(jump);
    jump.firstElementChild.onchange = event => {
        const section = document.getElementById(event.target.value);
        if (!section) return;
        section.tabIndex = -1;
        section.focus({ preventScroll:true });
        section.scrollIntoView({ block:'start' });
        event.target.selectedIndex = 0;
    };
    const fields=[['restaurantName','Nom du restaurant'],['description','Description'],['phone','Téléphone'],['whatsappNumber','WhatsApp'],['email','E-mail'],['address','Adresse'],['logoUrl','Adresse du logo'],['instagramUrl','Lien Instagram'],['facebookUrl','Lien Facebook']];
    let latest=null,expected=null,dirty=false,busy=false,confirmed=false;
    function render(){
        root.dataset.dirty=String(dirty);
        const c=latest||{};expected=copy({...c,id:'config'});root.innerHTML=`${[
 {id:'settings-identity',title:'Identité du restaurant',help:'Nom, présentation et logo affichés à vos clients.',keys:['restaurantName','description','logoUrl'],logo:true},
 {id:'settings-contact',title:'Contact et adresse',help:'Coordonnées utilisées pour contacter et trouver votre restaurant.',keys:['phone','whatsappNumber','email','address']},
 {id:'settings-links',title:'Liens et service',help:'Réseaux sociaux, fuseau horaire et modes de commande.',keys:['instagramUrl','facebookUrl'],service:true}
].map(group=>`<section class="admin-panel settings-section" id="${group.id}"><div class="settings-section-heading"><h3>${group.title}</h3><p class="settings-section-help">${group.help}</p></div><div class="settings-section-content"><div class="settings-fields">${group.keys.map(key=>{const label=fields.find(field=>field[0]===key)[1];return `<label class="settings-field${['description','address'].includes(key)?' settings-field--wide':''}" for="restaurant-${key}"><span>${label}</span><input class="w-full p-3 border rounded-xl" name="${key}" id="restaurant-${key}" value="${e(c[key])}" ${!confirmed?'disabled':''}></label>`;}).join('')}${group.logo?`<label class="settings-field"><span>Importer un logo</span><input class="w-full min-w-0" name="logoFile" type="file" accept="image/jpeg,image/png,image/webp" ${!confirmed?'disabled':''}></label>`:''}${group.service?`<label class="settings-field"><span>Fuseau horaire</span><input class="w-full p-3 border rounded-xl" name="reportingTimezone" value="${e(c.reportingTimezone||'Africa/Casablanca')}"></label>`:''}</div>${group.service?`<fieldset class="settings-modes"><legend>Modes de commande</legend>${[['livraison','Livraison'],['emporter','À emporter'],['sur_place','Sur place']].map(([key,label])=>`<label class="block"><input type="checkbox" name="mode-${key}" ${c.orderingModes?.[key]!==false?'checked':''}> ${label}</label>`).join('')}</fieldset>`:''}</div></section>`).join('')}<fieldset class="admin-panel settings-hours" id="settings-weekly-hours"><legend>Horaires hebdomadaires</legend><label class="settings-hours-enable"><input type="checkbox" name="useHours" aria-controls="settings-hours-days" ${Array.isArray(c.openingHours)?'checked':''}><span><strong>Appliquer les horaires</strong><small>Indépendants de la fermeture manuelle du restaurant.</small></span></label><p class="settings-hours-help">Une fermeture après minuit appartient à la journée d’ouverture. Les heures identiques sont refusées.</p><div class="settings-hours-days" id="settings-hours-days">${['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((day,i)=>{const h=c.openingHours?.[i]||{closed:false,start:'11:00',end:'23:00'};return `<div class="settings-day"><span class="settings-day-name">${day}</span><label class="settings-day-closed"><input type="checkbox" name="closed-${i}" ${h.closed?'checked':''}><span>Fermé</span></label><label class="settings-time"><span>Ouverture</span><input type="time" name="start-${i}" value="${e(h.start)}" aria-label="Ouverture ${day}"></label><label class="settings-time"><span>Fermeture</span><input type="time" name="end-${i}" value="${e(h.end)}" aria-label="Fermeture ${day}"></label></div>`;}).join('')}</div></fieldset><div class="settings-save"><p class="settings-section-help">La modification des frais, des zones de livraison et du minimum de commande est indisponible. Vos réglages actuels sont conservés.</p><p role="status" id="restaurant-profile-feedback"></p><div class="settings-save-actions"><button class="admin-button primary" ${!confirmed?'disabled':''}>Enregistrer les informations</button><button class="admin-button" type="button" id="restaurant-profile-reload">Recharger</button></div></div>`;
        const hours = root.elements.useHours;
        const showHours = () => {
            root.querySelector('#settings-hours-days').hidden = !hours.checked;
            root.querySelector('.settings-hours-help').hidden = !hours.checked;
        };
        hours.addEventListener('change', showHours);
        showHours();
        root.querySelector('#restaurant-profile-reload').onclick=()=>{dirty=false;render();};
    }
    root.addEventListener('input',()=>{ dirty=true; root.dataset.dirty='true'; });
    root.addEventListener('submit',async event=>{
        event.preventDefault();if(!confirmed||busy||!session())return;
        const patch=Object.fromEntries(fields.map(([key])=>[key,root.elements.namedItem(key).value.trim()]));patch.reportingTimezone=root.elements.reportingTimezone.value.trim();patch.orderingModes=Object.fromEntries(['livraison','emporter','sur_place'].map(key=>[key,root.elements.namedItem('mode-'+key).checked]));patch.openingHours=root.elements.useHours.checked?Array.from({length:7},(_,i)=>({closed:root.elements.namedItem('closed-'+i).checked,start:root.elements.namedItem('start-'+i).value,end:root.elements.namedItem('end-'+i).value})):null;
        const feedback=root.querySelector('#restaurant-profile-feedback');const issues=settingsIssues(patch);if(issues.length){feedback.textContent=issues.join(' ');return;}
        busy=true;const actor=session();root.querySelectorAll('button').forEach(b=>b.disabled=true);feedback.textContent='Enregistrement…';
        try{const file=root.elements.logoFile.files[0];if(file){const issue=imageIssue(file);if(issue)throw Error(issue);patch.logoUrl=await upload(file);}if(actor.uid!==session()?.uid||actor.epoch!==session()?.epoch)throw Error('Votre session a changé.');await service.settings(patch,expected);dirty=false;render();root.querySelector('#restaurant-profile-feedback').textContent='Informations enregistrées.';toast('Informations enregistrées.');}catch(error){feedback.textContent=error.message;toast(error.message,'error');}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=!confirmed);}
    });
    render();return {update(config,cached=false){latest=config;confirmed=!config._unavailable&&!cached;if(!dirty&&!busy)render();else if(dirty)root.querySelector('#restaurant-profile-feedback').textContent='Configuration reçue pendant l’édition. Rechargez avant d’enregistrer si elle a changé.';},clear(){latest=null;confirmed=false;dirty=false;render();}};
}
