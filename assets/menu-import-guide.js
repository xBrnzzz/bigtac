export const menuImportExample = {
    version: 1,
    currency: 'MAD',
    categories: [{ id: 'tacos', name: 'Tacos' }],
    modifierGroups: [
        {
            id: 'sauces', kind: 'choice', title: 'Sauces', type: 'checkbox', min: 0, max: 2,
            options: [
                { name: 'Algérienne', price: 0, isAvailable: true },
                { name: 'Barbecue', price: 0, isAvailable: true }
            ]
        },
        {
            id: 'extras-tacos', kind: 'supplements', title: 'Suppléments tacos', type: 'checkbox', min: 0, max: 0,
            options: [{ name: 'Cheddar', price: 5, isAvailable: true }]
        }
    ],
    products: [{
        id: 'tacos-poulet', categoryId: 'tacos', name: 'Tacos poulet',
        description: 'Poulet grillé et frites.', price: 45, isAvailable: true, isPopular: true,
        modifierGroupIds: ['sauces', 'extras-tacos'],
        mandatoryChoices: [{
            title: 'Taille', type: 'radio', min: 1, max: 1,
            options: [
                { name: 'M', price: 0, isAvailable: true },
                { name: 'L', price: 10, isAvailable: true }
            ]
        }],
        supplements: []
    }],
    promotions: [{
        id: 'menu-tacos-poulet', name: 'Menu tacos poulet',
        description: 'Tacos poulet, frites et une boisson au choix.', price: 60,
        startsAt: null, endsAt: null,
        mandatoryChoices: [{
            title: 'Boisson', type: 'radio', min: 1, max: 1,
            options: [
                { name: 'Eau', price: 0, isAvailable: true },
                { name: 'Soda', price: 0, isAvailable: true }
            ]
        }],
        supplements: [{ name: 'Cheddar', price: 5, isAvailable: true }]
    }]
};

export const menuImportPrompt = `Je veux importer la carte de mon restaurant dans mon site de commande. Lis toutes les photos jointes et prépare un fichier JSON unique contenant catégories, produits, groupes de choix, suppléments, promotions et best sellers.

1. Lire et clarifier
Conserve la langue, les accents, les noms et l’ordre de la carte. Copie uniquement les descriptions imprimées ou confirmées. Élimine les doublons dus aux photos qui se recouvrent. Si une page est illisible ou manquante, demande une nouvelle photo.

Avant de générer le fichier, pose en une seule liste numérotée les questions nécessaires, dans ma langue. Cite les noms des produits, offres ou groupes concernés. Ne repose pas une question résolue par le menu. Attends mes réponses et demande une précision si une règle qui change la commande ou le prix reste ambiguë.

- Catégories et prix : confirme les noms, catégories et prix ambigus. Si un plat a plusieurs tailles ou tarifs, demande s’il s’agit de produits séparés ou d’un choix. Pour un choix, confirme le prix de base et les écarts. Un M à 45 DH et un L à 55 DH donnent une base à 45, M à +0 et L à +10. Si la devise imprimée est différente, demande les prix à utiliser en DH.
- Choix : pour chaque groupe (tailles, viandes, sauces, accompagnements), demande à quels produits et offres il s’applique, s’il est obligatoire, combien d’options sont autorisées, si une option peut être choisie plusieurs fois et quelles options coûtent plus cher. Si la carte indique « 2 viandes », demande si elles sont imposées ou à choisir, puis vérifie si elles doivent être distinctes. Confirme avant de partager un groupe lorsque ses règles ou tarifs pourraient varier entre produits.
- Suppléments : pour une liste séparée, demande si chaque entrée est incluse d’office, incluse parmi des choix, proposée en supplément facultatif, ou vendue comme un produit indépendant. Confirme le prix et à quels produits ou offres elle s’applique.
- Promotions : confirme le prix de l’offre, les quantités incluses, les options, les substitutions et les dates dans le fuseau local du restaurant. Une promotion est une offre commandable séparément à prix fixe avec des options éventuelles. Une remise conditionnelle au panier, une offre selon le mode de livraison ou une récurrence hebdomadaire nécessitent une adaptation approuvée.
- Best sellers et disponibilité : utilise les repères explicites de la carte. En cas de doute ou sans repère, demande quels produits mettre en avant, ou si la sélection doit rester vide. Signale les éléments marqués indisponibles et demande comment traiter les mentions saisonnières. À défaut d'indication, indique à l’utilisateur que les produits et options ordinaires sont considérés disponibles.

Le site additionne les prix des options choisies au prix de base et applique les limites séparément à chaque groupe. Il ne permet pas de choisir deux fois la même option dans un groupe. Pour une règle comme « deux sauces gratuites, chaque suivante +3 DH », un prix qui dépend d’une autre option ou un choix répétable, explique le cas et demande l’autorisation avant de proposer une adaptation. Explique ce que le client pourra choisir et payer. Si aucune solution ne convient, demande une configuration prise en charge ou l’autorisation d’omettre l’élément concerné. N’invente aucun prix, ingrédient, choix, statut best seller ou date.

2. Règles de sélection
Chaque groupe a title, type, min, max et options.
- Exactement une option : radio, min 1, max 1.
- Zéro ou une option : radio, min 0, max 1.
- Jusqu’à N options : checkbox, min 0, max N.
- Exactement N options distinctes : checkbox, min N, max N.
- Entre N et M options : checkbox, min N, max M.
- Au moins N sans autre limite : checkbox, min N, max 0.
- Toutes les options sont facultatives : checkbox, min 0, max 0.
Avec checkbox, max 0 autorise toutes les options disponibles, une fois chacune. Avec radio, max vaut toujours 1. Utilise des nombres entiers et vérifie que le minimum peut être atteint avec les options disponibles. Le prix de chaque option est un supplément au prix de base. Le prix 0 signifie que l’option est incluse. isAvailable vaut false pour une option indisponible.

mandatoryChoices contient les groupes propres à un produit ou une promotion, même lorsque min vaut 0. supplements contient les extras facultatifs, chacun sélectionnable une seule fois. Si un nombre de sélections doit être imposé à un ensemble d’extras, utilise un groupe de choix. Utilise modifierGroups pour les groupes réutilisables confirmés. Pour un groupe partagé de kind supplements, utilise checkbox, min 0 et max 0. Référence les groupes partagés par modifierGroupIds pour les produits seulement. Le site affiche les choix propres au produit avant les choix partagés, puis les suppléments. Si un ordre précis exige de mélanger les choix propres et partagés, place ces choix dans mandatoryChoices. Copie les choix et suppléments dans chaque promotion qui les utilise. Évite les doublons d’options sur un même article. Chaque groupe et la liste combinée de suppléments ont au plus 60 options. Chaque produit a jusqu’à 12 liens vers des groupes partagés et 20 groupes de choix une fois les groupes partagés inclus.

3. Format du fichier
Reproduis exactement les champs de cet exemple. Remplace ses valeurs par celles de mon menu.

${JSON.stringify(menuImportExample, null, 2)}

Utilise [] pour une liste vide et "" si aucune description n’a été fournie. Utilise true ou false pour les indicateurs. Utilise des identifiants uniques par liste, en minuscules sans accents, avec chiffres ou tirets, de 80 caractères maximum. Les références categoryId et modifierGroupIds doivent mener à un identifiant du fichier. Déclare chaque groupe identique une seule fois. Garde l’ordre des catégories, des articles, des offres, des groupes et des options. Limite les titres, catégories et noms d’options à 120 caractères, les noms de produits et d’offres à 160, et les descriptions à 3 000. Si un texte dépasse sa limite, demande une version abrégée. N’ajoute pas de champs de publication ni de photos de la carte comme images des produits.

Utilise des nombres JSON en DH, positifs ou nuls, avec au plus deux décimales. Pour les promotions, utilise null quand il n’y a pas de date, ou une date ISO 8601 avec fuseau explicite, par exemple 2026-12-01T12:00:00+01:00. La fin doit suivre le début. Limite le fichier à 512 Ko et chacune des quatre listes à 300 éléments. Si le menu ne tient pas dans un import de 399 nouveaux éléments, demande comment le répartir en fichiers où toutes les références nécessaires sont présentes.

Avant d’exporter, vérifie les totaux de commandes types avec options payantes, la disponibilité pour les groupes obligatoires, les références et les dates. Si une donnée importante reste incertaine, demande une réponse avant d’exporter. Quand les règles sont confirmées, renvoie un fichier UTF-8 restaurant-menu.json. Si tu ne peux pas joindre de fichier, renvoie uniquement le JSON brut, sans commentaires, balises Markdown ni texte supplémentaire.`;

const translatedInstructions = {
    en: `Read the attached photos of my restaurant menu and produce one JSON file containing categories, products, choice groups, extras, promotions and best sellers.

1. Read and clarify
Keep the language, spelling, accents and order used on the physical menu. Use only printed or confirmed descriptions. Deduplicate overlapping photos and ask for replacements for missing or unreadable pages. Before writing the file, ask all necessary questions in one numbered list in my language. Name the affected items, skip questions the menu answers, and wait for my answers before resolving anything that affects ordering or prices.

- Confirm unclear categories, names and prices. Ask whether different sizes are separate products or choices. For choices, confirm the base price and each price difference (M at 45 DH and L at 55 DH means base 45, M +0, L +10). Ask which DH prices to use if another currency is shown.
- Confirm what each group applies to, whether it is required, its minimum and maximum, whether choices must be distinct, and any price differences. For “2 meats”, ask whether they are fixed or selected. Share a group only if its rules and prices match across all linked products.
- For extras listed separately, ask whether each is included by default, included among choices, an optional paid extra, or a separately sold product. Confirm the price and the items or offers to which each extra applies.
- Confirm fixed-price offers, quantities, substitutions, choices and dates in the restaurant's time zone. A promotion can be ordered separately. Ask before adapting discounts with cart conditions, delivery-mode restrictions or weekly schedules.
- Use explicit best seller and availability marks. If unclear, ask which products to feature or whether to leave the selection empty. Ask how to handle seasonal items. Tell the owner that ordinary items and options will be treated as available if the menu gives no availability information.

The site adds selected option prices to the base price and counts each group independently. Each option can be selected once. Explain and ask before adapting rules like “two sauces free, then 3 DH each”, repeatable options or prices that depend on another choice. Describe what the customer could choose and pay. If no suitable adaptation exists, ask for a supported rule or permission to omit the affected entry. Never invent prices, ingredients, choices, best sellers or dates.

2. Selection rules
Every group has title, type, min, max and options. Use radio with max 1 and min 1 for one required choice, or min 0 for one optional choice. Use checkbox for multiple distinct choices: min 0/max N for up to N, min N/max N for exactly N, min N/max M for a range, and max 0 when there is no limit beyond the number available. Use integer limits, verify the minimum is achievable, and price options as additions to the base price (0 if included). Set isAvailable to false for unavailable options.

Put product- and promotion-specific groups in mandatoryChoices even if min is 0. Put optional extras in supplements, which allows one of each. Use a choice group for extras that have a selection limit. Confirm reusable groups before adding them to modifierGroups. A shared supplements group uses kind supplements, checkbox, min 0 and max 0. Only products can refer to shared groups through modifierGroupIds. Products show their own choices first, then shared choices, then extras. Use mandatoryChoices if a specific order requires mixing those groups. Copy the applicable choices and extras into each promotion. Avoid duplicate options on one item. Allow at most 60 options per group and across combined extras, 12 links to shared groups and 20 choice groups total per product.

3. Output
Use exactly the keys in the example and replace its values with my menu's data. Use [] for empty lists, "" when no description was supplied, and true/false for flags. IDs must be unique within each list, at most 80 characters, and use lowercase ASCII letters, digits and hyphens. categoryId and modifierGroupIds must reference IDs in the same file. Declare each identical shared group once. Preserve printed order. Limit category names, group titles and option names to 120 characters, product and promotion names to 160 and descriptions to 3,000. Ask for shortened text where necessary. Add no publication fields or menu photos as product images.

Use nonnegative JSON numbers in DH with at most two decimal places. For promotions, use null for absent dates or ISO 8601 with an explicit offset, for example 2026-12-01T12:00:00+01:00. The end must follow the start. Limit the file to 512 KB and each of the four lists to 300 entries. If there would be over 399 new entries, ask how to split them into files with all required references.

Verify sample order totals with paid options, required choice availability, references and dates. Ask if anything important is unresolved. Return a UTF-8 restaurant-menu.json file, or raw JSON only with no comments, Markdown or extra text if attaching a file is unavailable.`,
    ar: `اقرأ الصور المرفقة لقائمة مطعمي وأنشئ ملف JSON واحداً يحتوي على الفئات والمنتجات ومجموعات الاختيارات والإضافات والعروض والأصناف الأكثر طلباً.

١. القراءة والاستيضاح
احتفظ بلغة القائمة وأسمائها وترتيبها كما هي. استعمل الأوصاف المطبوعة أو المؤكدة فقط. أزل التكرار بين الصور المتداخلة، واطلب صورة جديدة لأي صفحة ناقصة أو غير مقروءة. قبل إنشاء الملف، اجمع الأسئلة اللازمة في قائمة مرقمة واحدة بلغتي. حدّد الأصناف والمجموعات المعنية، ولا تسأل عما توضحه القائمة، وانتظر جوابي عندما تؤثر القاعدة في السعر أو طريقة الطلب.

- أكّد الفئات والأسماء والأسعار الملتبسة. اسأل هل الأحجام المختلفة منتجات مستقلة أم اختيارات. إن كانت اختيارات فأكّد سعر الأساس والفرق لكل خيار. مثال: إذا كان الحجم M بسعر 45 درهماً وL بسعر 55 درهماً، فالأساس 45، وخيار M يضيف 0، وخيار L يضيف 10. اسأل عن أسعار الدرهم إذا كانت العملة المطبوعة مختلفة.
- حدّد الأصناف والعروض التي تنطبق عليها كل مجموعة، وهل هي إلزامية، والحدين الأدنى والأقصى، وهل يجب أن تكون الخيارات مختلفة، وأي خيار يزيد السعر. إذا وجدت عبارة «نوعان من اللحم»، فاسأل هل النوعان محددان أم يختارهما العميل. لا تعِد استعمال المجموعة نفسها إلا عند تطابق قواعدها وأسعارها.
- اسأل عن كل إضافة في قائمة منفصلة: هل تأتي مع الصنف تلقائياً، أم تدخل ضمن الاختيارات، أم تباع كإضافة اختيارية بمقابل، أم هي منتج مستقل؟ أكّد أسعارها والأصناف أو العروض التي تناسبها.
- أكّد سعر العرض الثابت والكميات المضمّنة والبدائل والخيارات والتواريخ حسب توقيت المطعم. العرض صنف مستقل يمكن طلبه. استشرني قبل تكييف خصم مشروط بمحتوى السلة أو طريقة الاستلام أو جدول أسبوعي.
- اعتمد علامات التوفر والأكثر طلباً الواضحة. عند غيابها اسأل عن الأصناف التي أريد إبرازها أو إن كنت أفضّل تركها فارغة. استوضح أمر الأصناف الموسمية واذكر أن الأصناف والخيارات العادية ستعتبر متوفرة عند غياب أي بيان عن توفرها.

يضيف الموقع أسعار الاختيارات إلى السعر الأساسي، ويطبّق الحدود على كل مجموعة على حدة. كل خيار يمكن تحديده مرة واحدة. اشرح القيود واطلب الموافقة قبل تكييف قاعدة مثل «صلصتان مجاناً ثم 3 دراهم لكل صلصة» أو خيار متكرر أو سعر يعتمد على خيار آخر. وضّح ما الذي سيتمكن العميل من اختياره وما الذي سيدفعه. إن تعذّر التكييف، اطلب قاعدة يدعمها الموقع أو إذناً بحذف العنصر. لا تخترع أسعاراً أو مكونات أو اختيارات أو تواريخ أو أصنافاً أكثر طلباً.

٢. قواعد الاختيار
تتضمن كل مجموعة الحقول title وtype وmin وmax وoptions. استخدم radio لاختيار واحد مع max بقيمة 1، وmin بقيمة 1 للإلزام أو 0 للاختيار. استخدم checkbox لاختيارات متعددة ومختلفة: min بقيمة 0 وmax بقيمة N حتى N خيارات، أو min وmax بقيمة N لاختيار N بالضبط، أو من N إلى M. في checkbox يشير max بقيمة 0 إلى السماح بجميع الخيارات المتاحة مرة واحدة لكل خيار. استخدم أعداداً صحيحة للحدود وتحقق من إمكانية بلوغ الحد الأدنى. سعر الخيار زيادة على الأساس (0 للخيار المضمّن). استخدم false في isAvailable للخيار غير المتوفر.

ضع مجموعات الصنف أو العرض الخاصة في mandatoryChoices حتى عندما تكون min بقيمة 0. ضع الإضافات الاختيارية في supplements، ويُسمح بتحديد كل إضافة مرة واحدة. استخدم مجموعة اختيارات إذا لزم تقييد عدد الإضافات. ضع المجموعات المشتركة المؤكدة في modifierGroups. لمجموعة إضافات مشتركة استخدم kind بقيمة supplements، وcheckbox، وmin وmax بقيمة 0. المنتجات فقط ترتبط بمجموعات مشتركة عبر modifierGroupIds. تظهر الاختيارات الخاصة أولاً، ثم المشتركة، ثم الإضافات. إذا تطلب ترتيب القائمة دمجها فضعها في mandatoryChoices. انسخ الاختيارات والإضافات المناسبة داخل كل عرض. تجنّب تكرار الخيار في الصنف ذاته. الحد لكل مجموعة أو لقائمة الإضافات المجمعة 60 خياراً. الحد لكل منتج 12 ارتباطاً مشتركاً و20 مجموعة اختيارات إجمالاً.

٣. صيغة الملف
استخدم حقول المثال بالضبط واستبدل قيمه ببيانات قائمتي. استخدم [] للقوائم الفارغة، و"" عند غياب الوصف، وtrue أو false للمؤشرات. يجب أن يكون كل معرّف فريداً داخل قائمته وبحد أقصى 80 حرفاً، من حروف لاتينية صغيرة أو أرقام أو شرطات. يجب أن يشير categoryId وmodifierGroupIds إلى معرّف موجود في الملف ذاته. عرّف المجموعة المشتركة المتطابقة مرة واحدة. حافظ على ترتيب القائمة. الحد لأسماء الفئات وعناوين المجموعات وأسماء الخيارات 120 حرفاً، ولأسماء المنتجات والعروض 160، وللوصف 3000. اطلب نصاً مختصراً عند تجاوز الحد. لا تضف حقول نشر أو تستخدم صور القائمة صوراً للمنتجات.

الأسعار أرقام JSON بالدرهم غير سالبة وبمنزلتين عشريتين على الأكثر. استخدم null عند غياب تاريخ للعرض أو صيغة ISO 8601 بتوقيت صريح، مثل 2026-12-01T12:00:00+01:00. تاريخ النهاية بعد البداية. الحد لحجم الملف 512 كيلوبايت و300 عنصر في كل قائمة من القوائم الأربع. إذا تجاوز عدد العناصر الجديدة 399، اسأل كيف تقسمها إلى ملفات فيها جميع المراجع المطلوبة.

تحقق من إجمالي الطلبات النموذجية ذات الاختيارات المدفوعة وتوفر الخيارات الإجبارية وصحة المراجع والتواريخ. استوضح أي معلومة مهمة ناقصة قبل التصدير. أرسل ملف restaurant-menu.json بترميز UTF-8، أو أرسل JSON الخام فقط دون تعليقات أو Markdown أو نص إضافي إذا تعذر إرفاق ملف.`
};

export function menuImportPromptFor(locale) {
    const instructions = translatedInstructions[locale];
    return instructions ? instructions + '\n\n' + JSON.stringify(menuImportExample, null, 2) : menuImportPrompt;
}
