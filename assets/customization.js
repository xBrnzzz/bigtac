// Customer-side selection rules and totals. These do not replace server validation.
export function buildCustomizationSteps(item) {
    const steps = (item.mandatoryChoices || []).map(group => ({
        type: 'choice', title: group.title || 'Votre choix',
        data: { ...group, options: group.options || [] }
    }));
    if (item.supplements?.length) steps.push({ type: 'supplements', title: 'Suppléments', data: item.supplements });
    return steps;
}

export function choiceRules(step) {
    const options = step.type === 'supplements' ? step.data : step.data.options;
    if (step.type === 'supplements') return { options, min: 0, max: options.length, radio: false };
    const radio = step.data.type === 'radio' || (Number(step.data.max) === 1 && Number(step.data.min) === 1);
    const configuredMin = Number(step.data.min);
    const min = Number.isFinite(configuredMin) ? Math.max(0, configuredMin) : radio ? 1 : 0;
    const configuredMax = Number(step.data.max);
    // Existing menu editors store zero for an unspecified maximum.
    const max = radio ? 1 : configuredMax > 0 ? configuredMax : options.length;
    return { options, min, max, radio };
}

export function selectionIssue(step, selections = []) {
    const { options, min, max } = choiceRules(step);
    if (min > Math.min(options.length, max)) return 'Ce choix est indisponible. Choisissez un autre plat ou contactez le restaurant.';
    if (selections.length < min) return `Choisissez ${min === 1 ? 'au moins une option' : `au moins ${min} options`} pour continuer.`;
    if (selections.length > max) return `Choisissez au maximum ${max} option${max > 1 ? 's' : ''}.`;
    return '';
}

export function customizationPrice(item, selections, quantity = 1) {
    const extras = Object.values(selections).flat().reduce((sum, option) => sum + (Number(option.price) || 0), 0);
    return ((Number(item?.price) || 0) + extras) * quantity;
}

export function cartSelections(steps, selections) {
    const selectedOptions = [], supplements = [];
    steps.forEach((step, index) => {
        const target = step.type === 'supplements' ? supplements : selectedOptions;
        (selections[index] || []).forEach(({ name, price }) => target.push({ name, price }));
    });
    return { selectedOptions, supplements };
}
