// Customer-side selection rules and totals. These do not replace server validation.
export function moneyCents(value=0) {
    const amount=Number(value),minor=Math.round(amount*100);
    if(!Number.isSafeInteger(minor)||Math.abs(amount*100-minor)>.00001)throw new RangeError('Montant invalide : deux décimales maximum.');
    return minor;
}
export function optionMatches(option,selection) {
    return (!selection.id||option.id===selection.id)&&(!selection.sourceGroupId||option.sourceGroupId===selection.sourceGroupId)&&option.name===selection.name&&Number(option.price||0)===Number(selection.price||0);
}
export function optionSnapshot({name,price,id,sourceGroupId}) {
    return {name,price,...(id?{id}:{}),...(sourceGroupId?{sourceGroupId}:{})};
}
export function cartChoiceSelections(steps,selections) {
    return steps.flatMap((step,index)=>step.type==='choice'?[{title:step.title,...(step.data.id||step.data.sourceGroupId?{groupId:step.data.id||step.data.sourceGroupId}:{groupIndex:index}),options:(selections[index]||[]).map(optionSnapshot)}]:[]);
}
export function recordedChoices(step,steps,row) {
    const id=step.data.id||step.data.sourceGroupId;
    if(Array.isArray(row.choiceSelections)) {
        const index=steps.indexOf(step);
        const candidates=row.choiceSelections.filter(record=>record.groupId?record.groupId===id:record.title===step.title&&(record.groupIndex==null||record.groupIndex===index));
        if(candidates.length===1)return candidates[0].options||[];
        // Older group records were positional, before local group identity metadata.
        const legacy=row.choiceSelections[index];
        if(candidates.length>1&&legacy&&!legacy.groupId&&legacy.groupIndex==null&&legacy.title===step.title)return legacy.options||[];
        return null;
    }
    // Legacy local carts have no group records. Refuse ambiguous cross-group names.
    const options=choiceRules(step).options,selected=row.selectedOptions||[];
    const matching=selected.filter(selection=>options.some(option=>optionMatches(option,selection)));
    if(matching.some(selection=>steps.filter(other=>choiceRules(other).options.some(option=>optionMatches(option,selection))).length!==1))return null;
    return matching;
}

export function buildCustomizationSteps(item) {
    const steps = (item.mandatoryChoices || []).map(group => ({
        type: 'choice', title: group.title || 'Votre choix',
        data: { ...group, options: (group.options || []).filter(option=>option.isAvailable!==false) }
    }));
    const supplements=(item.supplements||[]).filter(option=>option.isAvailable!==false);
    if (supplements.length) steps.push({ type: 'supplements', title: 'Suppléments', data: supplements });
    return steps;
}

export function choiceRules(step) {
    const options = (step.type === 'supplements' ? step.data : step.data.options).filter(option=>option.isAvailable!==false);
    if (step.type === 'supplements') return { options, min: 0, max: options.length, radio: false };
    const radio = step.data.type === 'radio' || (Number(step.data.max) === 1 && Number(step.data.min) === 1);
    const configuredMin = Number(step.data.min);
    const min = Number.isFinite(configuredMin) ? Math.max(0, configuredMin) : radio ? 1 : 0;
    const configuredMax = Number(step.data.max);
    // Existing menu editors store zero for an unspecified maximum.
    const max = radio ? 1 : configuredMax > 0 ? configuredMax : options.length;
    const invalid=step.data.min!=null&&(!Number.isInteger(configuredMin)||configuredMin<0)||step.data.max!=null&&(!Number.isInteger(configuredMax)||configuredMax<0)||radio&&configuredMax>1;
    return { options, min, max, radio,invalid };
}

export function selectionIssue(step, selections = []) {
    if(!Array.isArray(selections))return 'Les groupes de choix ont changé. Composez ce produit à nouveau.';
    const { options, min, max,invalid } = choiceRules(step);
    if(invalid)return 'Ce groupe est mal configuré. Contactez le restaurant.';
    if (min > Math.min(options.length, max)) return 'Ce choix est indisponible. Choisissez un autre plat ou contactez le restaurant.';
    if (selections.length < min) return `Choisissez ${min === 1 ? 'au moins une option' : `au moins ${min} options`} pour continuer.`;
    if (selections.length > max) return `Choisissez au maximum ${max} option${max > 1 ? 's' : ''}.`;
    const indexes=selections.map(selection=>options.findIndex(option=>optionMatches(option,selection)));
    if(indexes.some(index=>index<0))return 'Une option a changé ou n’est plus disponible. Recommencez ce choix.';
    if(new Set(indexes).size!==indexes.length)return 'Choisissez chaque option une seule fois.';
    return '';
}

export function customizationPrice(item, selections, quantity = 1) {
    if(!Number.isSafeInteger(quantity)||quantity<1)throw new RangeError('Quantité invalide.');
    const extras = Object.values(selections).flat().reduce((sum, option) => sum + moneyCents(option.price||0), 0);
    const total=(moneyCents(item?.price||0)+extras)*quantity;
    if(!Number.isSafeInteger(total))throw new RangeError('Total hors limite.');
    return total/100;
}

export function cartSelections(steps, selections) {
    const selectedOptions = [], supplements = [];
    steps.forEach((step, index) => {
        const target = step.type === 'supplements' ? supplements : selectedOptions;
        (selections[index] || []).forEach(option=>target.push(optionSnapshot(option)));
    });
    return { selectedOptions, supplements };
}
