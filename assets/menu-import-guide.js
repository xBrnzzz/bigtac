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
