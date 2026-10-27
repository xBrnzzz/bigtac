import {auth,db,doc,runTransaction} from '../firebase-config.js';
import {profileRole} from './admin-model.js';
import {fingerprint} from './menu-model.js';
import {offerIssues,assignmentIssue,settingsIssues} from './operations-model.js';
// Client conflict/session safeguards; deployed Rules/trusted services are required.
export function operationsService(session){
    async function transact(work){
        const actor=session();if(!actor||auth.currentUser?.uid!==actor.uid||!['admin','manager'].includes(profileRole(actor)))throw Error('Accès non autorisé.');
        if(!navigator.onLine)throw Error('Hors connexion. Reconnectez-vous puis réessayez.');
        return runTransaction(db,async tx=>{
            const member=await tx.get(doc(db,'users',actor.uid)),live=session();
            if(!member.exists()||!['admin','manager'].includes(profileRole(member.data()))||!live||live.uid!==actor.uid||live.epoch!==actor.epoch||live.role!==actor.role)throw Error('Votre accès a changé.');
            return work(tx,member.data());
        });
    }
    const unchanged=(snap,expected)=>{if(!snap.exists()||fingerprint({...snap.data(),id:snap.id})!==fingerprint(expected))throw Error('Contenu modifié ailleurs. Fermez puis rechargez avant de réessayer.');};
    return {
        offer:({id,patch,expected,remove=false})=>transact(async tx=>{
            const ref=doc(db,'promotions',id),snap=await tx.get(ref);
            if(expected)unchanged(snap,expected);else if(snap.exists())throw Error('Offre déjà existante.');
            if(remove){tx.delete(ref);return;}
            const issues=offerIssues({...snap.data(),...patch});if(issues.length)throw Error(issues[0]);
            if(expected)tx.update(ref,patch);else tx.set(ref,patch);
        }),
        assign:({id,driverId,expected})=>transact(async(tx,actor)=>{
            const ref=doc(db,'orders',id),snap=await tx.get(ref),target=driverId?await tx.get(doc(db,'users',driverId)):null;
            if(driverId&&!target.exists())throw Error('Livreur introuvable.');
            const issue=assignmentIssue(actor,snap.exists()?snap.data():null,target?.data(),expected);
            if(issue)throw Error(issue==='permission'?'Accès non autorisé.':issue==='driver'?'Ce livreur est indisponible.':'Attribution modifiée ou commande non attribuable. Actualisez.');
            tx.update(ref,{deliveryGuyId:driverId||null,deliveryGuyName:driverId?String(target.data().name||'Livreur'):null});
        }),
        settings:(patch,expected)=>transact(async tx=>{
            const editable=['isOpen','whatsappMode','restaurantName','description','phone','whatsappNumber','email','address','logoUrl','instagramUrl','facebookUrl','websiteUrl','reportingTimezone','orderingModes','openingHours'];
            if(Object.keys(patch).some(key=>!editable.includes(key)))throw Error('Ce réglage nécessite une validation serveur distincte.');
            if(patch.orderingModes&&Object.keys(patch.orderingModes).some(key=>!['livraison','emporter','sur_place'].includes(key)))throw Error('Mode de commande non pris en charge.');
            const ref=doc(db,'settings','config'),snap=await tx.get(ref);unchanged(snap,expected);
            const flags=Object.keys(patch).every(key=>['isOpen','whatsappMode'].includes(key));
            const issues=flags?(Object.values(patch).every(value=>typeof value==='boolean')?[]:['Réglage invalide.']):settingsIssues({...snap.data(),...patch});if(issues.length)throw Error(issues[0]);
            const preserved={...patch},current=snap.data();
            if(patch.orderingModes)preserved.orderingModes={...current.orderingModes,...patch.orderingModes};
            if(Array.isArray(patch.openingHours))preserved.openingHours=patch.openingHours.map((day,index)=>({...((Array.isArray(current.openingHours)?current.openingHours[index]:{})||{}),...day}));
            tx.update(ref,preserved);
        })
    };
}
