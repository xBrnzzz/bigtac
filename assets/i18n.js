/**
 * BIGTAC Internationalization (i18n) Module
 * Supports: Français (FR), English (EN), العربية (AR) with RTL
 */

const translations = {
    fr: {
        // Navigation & Header
        'nav.skip': 'Aller à la carte',
        'nav.menu': 'La carte',
        'nav.offers': 'Les offres',
        'nav.info': 'Infos pratiques',
        'nav.cart': 'Panier',
        'nav.theme': 'Changer le thème',
        'nav.lang': 'Choisir la langue',

        // Hero
        'hero.status_loading': 'Disponibilité en cours…',
        'hero.status_open': 'Commandes ouvertes',
        'hero.status_closed': 'Fermé actuellement',
        'hero.title_lead': 'Grosse faim ?',
        'hero.subtitle': 'Votre tacos, à votre façon.',
        'hero.delivery_fee': 'Livraison dès 4 Dh',
        'hero.takeaway': 'À emporter',
        'hero.dinein': 'Sur place',
        'hero.table_order': '🪑 Commande à la Table',
        'hero.cta': 'Commander maintenant',
        'hero.closed_title': 'Le restaurant est fermé.',
        'hero.closed_desc': 'Vous pouvez parcourir la carte. Les commandes reprendront à l’ouverture.',

        // Sections
        'sections.promotions': 'Promotions',
        'sections.promotions_sub': 'À composer selon vos envies.',
        'sections.bestseller': 'Best Seller',
        'sections.bestseller_sub': 'La sélection BIGTAC, à votre façon.',
        'sections.menu': 'Notre carte',
        'sections.menu_sub': 'Tacos, gratinés, burgers… À vous de choisir.',
        'search.placeholder': 'Un tacos, un burger…',
        'search.clear': 'Effacer la recherche',
        'search.label': 'Rechercher dans la carte',
        'filter.all': 'Tout voir',

        // Product Badges
        'badge.popular': 'Favori',
        'badge.offer': 'Offre du moment',
        'badge.soldout': 'Rupture de stock',
        'badge.new': 'Nouveau',

        // Customization Modal
        'modal.choose': 'Choisir',
        'modal.composer': 'Composer',
        'modal.close': 'Fermer la fenêtre',
        'modal.size_required': 'Choisissez votre taille *',
        'modal.size_title': 'Taille',
        'modal.supplements_title': 'Suppléments',
        'modal.instructions_title': 'Instructions spéciales',
        'modal.instructions_placeholder': 'Sans oignons, sauce à part…',
        'modal.add_to_cart': 'Ajouter au panier',
        'modal.complete_choices': 'Compléter mes choix',
        'modal.ready_hint': 'Tout est prêt. Ajoutez votre repas au panier.',
        'modal.default_hint': 'Personnalisez votre repas.',
        'modal.missing_choice': 'Veuillez sélectionner : ',
        'modal.from_price': 'À partir de',
        'modal.required': 'Obligatoire',
        'modal.optional': 'Facultatif',
        'modal.quantity': 'Quantité',

        // Cart
        'cart.title': 'Mon panier',
        'cart.step': 'Votre sélection',
        'cart.empty_title': 'Votre panier est vide',
        'cart.empty_desc': 'Ajoutez vos tacos, boissons et desserts pour composer votre repas.',
        'cart.subtotal': 'Sous-total',
        'cart.delivery': 'Livraison',
        'cart.total': 'Total',
        'cart.checkout': 'Passer commande',
        'cart.clear': 'Vider le panier',
        'cart.edit': 'Modifier',
        'cart.remove': 'Retirer',
        'cart.empty_badge': '0 Dh',
        'cart.discover': 'Découvrir la carte',
        'cart.add_more': 'Ajouter d’autres envies',
        'cart.view_cart': 'Voir mon panier',
        'cart.fee_notice': 'Les frais de livraison s’ajoutent selon votre quartier.',

        // Service Modal
        'service.step': '2 / 3 · Réception',
        'service.title': 'Comment vous régaler ?',
        'service.delivery': 'Livraison',
        'service.delivery_sub': 'À Fès, dès 4 Dh selon votre quartier',
        'service.takeaway': 'À emporter',
        'service.takeaway_sub': 'Récupérez votre repas au comptoir',
        'service.dinein': 'Sur place',
        'service.dinein_sub': 'On se retrouve au restaurant',
        'service.back_coords': 'Retour aux coordonnées',

        // Delivery & GPS Modal
        'delivery.step': '2 / 3 · Livraison',
        'delivery.modal_title': 'Adresse de livraison à Fès',
        'delivery.modal_sub': 'Partagez votre position GPS en 1 clic ou saisissez votre adresse ci-dessous. Le restaurant confirmera avec vous par téléphone.',
        'delivery.gps_btn': '📍 Utiliser ma position GPS',
        'delivery.gps_locating': '📍 Détection de votre position GPS…',
        'delivery.gps_success': '✅ Position GPS enregistrée !',
        'delivery.gps_error': 'Impossible d’accéder au GPS. Veuillez saisir votre adresse ci-dessous.',
        'delivery.address_label': 'Adresse exacte de livraison',
        'delivery.address_sub': 'confirmée par téléphone',
        'delivery.address_placeholder': 'Quartier, rue, N° d\'immeuble, résidence, étage, repère…',
        'delivery.fee_note': 'Frais de livraison :',
        'delivery.fee_val': '4,00 Dh',
        'delivery.confirm_btn': 'Confirmer l\'adresse',
        'delivery.change_service': 'Changer le mode de réception',
        'delivery.hint_default': 'Précisez votre adresse pour la livraison.',

        // Checkout Name Modal
        'checkout.step': '1 / 3 · Coordonnées',
        'checkout.title': 'On prépare pour qui ?',
        'checkout.sub': 'Un nom et un numéro pour vous joindre au sujet de la commande.',
        'checkout.name_label': 'Votre nom',
        'checkout.name_placeholder': 'Ex. Amine Bennani',
        'checkout.phone_label': 'Téléphone',
        'checkout.phone_placeholder': 'Ex. 0612345678',
        'checkout.note_label': 'Une précision ?',
        'checkout.note_placeholder': 'Sans oignon, adresse précise, sonnette…',
        'checkout.note_allergy': 'Pour une allergie, contactez aussi le restaurant.',
        'checkout.required': 'obligatoire',
        'checkout.optional': 'facultatif',
        'checkout.btn_next': 'Choisir la réception',
        'checkout.btn_back_cart': 'Retour au panier',

        // Summary Modal
        'summary.step': '3 / 3 · Confirmation',
        'summary.title': 'Tout est bon ?',
        'summary.for_you': 'Pour vous',
        'summary.reception': 'Réception',
        'summary.table_number': 'Numéro de table',
        'summary.edit': 'Modifier',
        'summary.your_meal': 'Votre repas',
        'summary.delivery': 'Livraison',
        'summary.total_to_pay': 'Total à payer',
        'summary.hint': 'Le restaurant confirmera votre commande.',
        'summary.finalize': 'Confirmer la commande',
        'summary.edit_cart': 'Modifier mon panier',

        // Location & Hours
        'location.title': 'On se retrouve à Fès',
        'location.itinerary': 'Ouvrir l’itinéraire',
        'location.hours_title': 'Les horaires',
        'location.hours_val': '7j / 7, de 12:00 à 02:00',
        'location.question': 'Une question sur votre commande ?',
        'location.whatsapp': 'WhatsApp',
        'location.call': 'Appeler',

        // Desktop Basket Preview
        'desktop_basket.title': 'Votre pause gourmande',
        'desktop_basket.sub_empty': 'Choisissez vos plats, on s’occupe du reste.',
        'desktop_basket.total': 'Total',
        'desktop_basket.btn': 'Voir mon panier',
        'desktop_basket.note': 'Frais de livraison précisés à la commande.',

        // Footer
        'footer.desc': 'Tacos & grill à Fès',

        // Order Tracker
        'tracker.title': 'Votre commande',
        'tracker.status_pending': 'En attente de confirmation…',
        'tracker.status_prep': 'En préparation en cuisine ! 👨‍🍳',
        'tracker.status_delivery': 'Prête / En cours de livraison ! 🛵',
        'tracker.status_delivered': 'Commande livrée ! Bon appétit 😋',
        'tracker.status_cancelled': 'Commande annulée',
        'tracker.retry': 'Réessayer le suivi',
        'tracker.close_aria': 'Fermer le suivi',

        // Driver Interface
        'driver.header_title': 'BIGTAC Livraison',
        'driver.header_subtitle': 'Espace Livreur',
        'driver.logout_aria': 'Déconnexion livreur',
        'driver.tab_available': 'Disponibles',
        'driver.tab_deliveries': 'Mes Courses',
        'driver.heading_available': 'Courses Disponibles à Récupérer',
        'driver.heading_deliveries': 'Mes Courses en Cours',
        'driver.btn_take': 'Prendre en charge',
        'driver.btn_delivered': 'Marquer comme Livré',
        'driver.open_gps': 'Ouvrir GPS / Maps',
        'driver.empty_available': 'Aucune course disponible actuellement.',
        'driver.empty_deliveries': 'Vous n’avez aucune course en cours.',

        // Admin Shell & General
        'admin.overview': 'Vue d’ensemble',
        'admin.orders': 'Commandes',
        'admin.menu': 'Menu & produits',
        'admin.promotions': 'Promotions',
        'admin.team': 'Équipe',
        'admin.settings': 'Paramètres',
        'admin.logout': 'Déconnexion',
        'admin.view_site': 'Voir le site client',
        'admin.login_title': 'BIGTAC Studio',
        'admin.login_subtitle': 'Connexion Administration',
        'admin.email': 'Email',
        'admin.password': 'Mot de passe',
        'admin.login_btn': 'Se Connecter',
        'admin.login_error': 'Email ou mot de passe incorrect.',
        'admin.connecting': 'Connexion…'
    },

    en: {
        // Navigation & Header
        'nav.skip': 'Skip to menu',
        'nav.menu': 'Menu',
        'nav.offers': 'Offers',
        'nav.info': 'Info',
        'nav.cart': 'Cart',
        'nav.theme': 'Toggle theme',
        'nav.lang': 'Choose language',

        // Hero
        'hero.status_loading': 'Checking hours…',
        'hero.status_open': 'Open for orders',
        'hero.status_closed': 'Currently closed',
        'hero.title_lead': 'Big hunger?',
        'hero.subtitle': 'Your tacos, crafted your way.',
        'hero.delivery_fee': 'Delivery from 4 Dh',
        'hero.takeaway': 'Takeaway',
        'hero.dinein': 'Dine-in',
        'hero.table_order': '🪑 Order to Table',
        'hero.cta': 'Order now',
        'hero.closed_title': 'The restaurant is closed.',
        'hero.closed_desc': 'You can explore our menu. Orders will resume as soon as we open.',

        // Sections
        'sections.promotions': 'Promotions',
        'sections.promotions_sub': 'Customize to your taste.',
        'sections.bestseller': 'Best Sellers',
        'sections.bestseller_sub': 'BIGTAC customer favorites.',
        'sections.menu': 'Our Menu',
        'sections.menu_sub': 'Tacos, gratins, burgers… You decide.',
        'search.placeholder': 'A taco, a burger…',
        'search.clear': 'Clear search',
        'search.label': 'Search our menu',
        'filter.all': 'All Items',

        // Product Badges
        'badge.popular': 'Popular',
        'badge.offer': 'Special Offer',
        'badge.soldout': 'Out of stock',
        'badge.new': 'New',

        // Customization Modal
        'modal.choose': 'Select',
        'modal.composer': 'Customize',
        'modal.close': 'Close window',
        'modal.size_required': 'Choose your size *',
        'modal.size_title': 'Size',
        'modal.supplements_title': 'Extras & Drinks',
        'modal.instructions_title': 'Special instructions',
        'modal.instructions_placeholder': 'No onions, sauce on the side…',
        'modal.add_to_cart': 'Add to Cart',
        'modal.complete_choices': 'Complete my choices',
        'modal.ready_hint': 'All set! Add your meal to cart.',
        'modal.default_hint': 'Customize your meal.',
        'modal.missing_choice': 'Please select: ',
        'modal.from_price': 'From',
        'modal.required': 'Required',
        'modal.optional': 'Optional',
        'modal.quantity': 'Quantity',

        // Cart
        'cart.title': 'My Cart',
        'cart.step': 'Your Selection',
        'cart.empty_title': 'Your cart is empty',
        'cart.empty_desc': 'Add your tacos, drinks, and desserts to compose your meal.',
        'cart.subtotal': 'Subtotal',
        'cart.delivery': 'Delivery',
        'cart.total': 'Total',
        'cart.checkout': 'Checkout',
        'cart.clear': 'Clear Cart',
        'cart.edit': 'Edit',
        'cart.remove': 'Remove',
        'cart.empty_badge': '0 Dh',
        'cart.discover': 'Discover Menu',
        'cart.add_more': 'Add more items',
        'cart.view_cart': 'View Cart',
        'cart.fee_notice': 'Delivery fees are added according to your neighborhood.',

        // Service Modal
        'service.step': '2 / 3 · Reception',
        'service.title': 'How would you like your meal?',
        'service.delivery': 'Delivery',
        'service.delivery_sub': 'In Fez, from 4 Dh depending on your area',
        'service.takeaway': 'Takeaway',
        'service.takeaway_sub': 'Pick up your order at the counter',
        'service.dinein': 'Dine-in',
        'service.dinein_sub': 'Enjoy your meal at the restaurant',
        'service.back_coords': 'Back to contact details',

        // Delivery & GPS Modal
        'delivery.step': '2 / 3 · Delivery',
        'delivery.modal_title': 'Delivery Address in Fez',
        'delivery.modal_sub': 'Share your GPS location in 1 tap or enter your address below. The restaurant will call to confirm.',
        'delivery.gps_btn': '📍 Use my GPS position',
        'delivery.gps_locating': '📍 Detecting your GPS location…',
        'delivery.gps_success': '✅ GPS position recorded!',
        'delivery.gps_error': 'Could not access GPS. Please enter your address below.',
        'delivery.address_label': 'Exact delivery address',
        'delivery.address_sub': 'confirmed by phone',
        'delivery.address_placeholder': 'Neighborhood, street, building, apartment, landmark…',
        'delivery.fee_note': 'Delivery fee:',
        'delivery.fee_val': '4.00 Dh',
        'delivery.confirm_btn': 'Confirm Address',
        'delivery.change_service': 'Change dining option',
        'delivery.hint_default': 'Enter your address for delivery.',

        // Checkout Name Modal
        'checkout.step': '1 / 3 · Contact Details',
        'checkout.title': 'Who is this order for?',
        'checkout.sub': 'A name and phone number to reach you regarding your order.',
        'checkout.name_label': 'Your full name',
        'checkout.name_placeholder': 'e.g. Amine Bennani',
        'checkout.phone_label': 'Phone number',
        'checkout.phone_placeholder': 'e.g. 0612345678',
        'checkout.note_label': 'Any special notes?',
        'checkout.note_placeholder': 'No onions, exact apartment, doorbell…',
        'checkout.note_allergy': 'For allergies, please contact the restaurant directly.',
        'checkout.required': 'required',
        'checkout.optional': 'optional',
        'checkout.btn_next': 'Choose Dining Option',
        'checkout.btn_back_cart': 'Back to cart',

        // Summary Modal
        'summary.step': '3 / 3 · Confirmation',
        'summary.title': 'Everything looks good?',
        'summary.for_you': 'For you',
        'summary.reception': 'Dining option',
        'summary.table_number': 'Table number',
        'summary.edit': 'Edit',
        'summary.your_meal': 'Your meal',
        'summary.delivery': 'Delivery',
        'summary.total_to_pay': 'Total to pay',
        'summary.hint': 'The restaurant will call to confirm your order.',
        'summary.finalize': 'Confirm Order',
        'summary.edit_cart': 'Edit my cart',

        // Location & Hours
        'location.title': 'Visit us in Fez',
        'location.itinerary': 'Open directions',
        'location.hours_title': 'Opening hours',
        'location.hours_val': '7 days/week, 12:00 PM – 2:00 AM',
        'location.question': 'Question about your order?',
        'location.whatsapp': 'WhatsApp',
        'location.call': 'Call us',

        // Desktop Basket Preview
        'desktop_basket.title': 'Your gourmet break',
        'desktop_basket.sub_empty': 'Choose your dishes, we take care of the rest.',
        'desktop_basket.total': 'Total',
        'desktop_basket.btn': 'View my cart',
        'desktop_basket.note': 'Delivery fees calculated at checkout.',

        // Footer
        'footer.desc': 'Tacos & grill in Fez',

        // Order Tracker
        'tracker.title': 'Your order',
        'tracker.status_pending': 'Waiting for restaurant confirmation…',
        'tracker.status_prep': 'Preparing in the kitchen! 👨‍🍳',
        'tracker.status_delivery': 'Ready / On the way with driver! 🛵',
        'tracker.status_delivered': 'Delivered! Enjoy your meal 😋',
        'tracker.status_cancelled': 'Order cancelled',
        'tracker.retry': 'Retry tracking',
        'tracker.close_aria': 'Close tracker',

        // Driver Interface
        'driver.header_title': 'BIGTAC Delivery',
        'driver.header_subtitle': 'Driver Workspace',
        'driver.logout_aria': 'Driver Logout',
        'driver.tab_available': 'Available',
        'driver.tab_deliveries': 'My Orders',
        'driver.heading_available': 'Orders Available for Pickup',
        'driver.heading_deliveries': 'My Ongoing Deliveries',
        'driver.btn_take': 'Accept & Deliver',
        'driver.btn_delivered': 'Mark as Delivered',
        'driver.open_gps': 'Open GPS / Maps',
        'driver.empty_available': 'No deliveries available at the moment.',
        'driver.empty_deliveries': 'You have no deliveries in progress.',

        // Admin Shell & General
        'admin.overview': 'Overview',
        'admin.orders': 'Orders',
        'admin.menu': 'Menu & Products',
        'admin.promotions': 'Promotions',
        'admin.team': 'Team',
        'admin.settings': 'Settings',
        'admin.logout': 'Logout',
        'admin.view_site': 'View customer site',
        'admin.login_title': 'BIGTAC Studio',
        'admin.login_subtitle': 'Staff Administration',
        'admin.email': 'Email',
        'admin.password': 'Password',
        'admin.login_btn': 'Sign In',
        'admin.login_error': 'Invalid email or password.',
        'admin.connecting': 'Connecting…'
    },

    ar: {
        // Navigation & Header
        'nav.skip': 'تخطي إلى القائمة',
        'nav.menu': 'القائمة',
        'nav.offers': 'العروض',
        'nav.info': 'معلومات',
        'nav.cart': 'السلة',
        'nav.theme': 'تغيير المظهر',
        'nav.lang': 'اختيار اللغة',

        // Hero
        'hero.status_loading': 'جارٍ التحقق…',
        'hero.status_open': 'الطلبات مفتوحة',
        'hero.status_closed': 'المطعم مغلق حالياً',
        'hero.title_lead': 'جيعان ؟',
        'hero.subtitle': 'التاكوس ديالك، بطريقتك المفضلة.',
        'hero.delivery_fee': 'التوصيل ابتداءً من 4 دراهم',
        'hero.takeaway': 'للأخذ',
        'hero.dinein': 'بعين المكان',
        'hero.table_order': '🪑 الطلب إلى الطاولة',
        'hero.cta': 'اطلب دابا',
        'hero.closed_title': 'المطعم مغلق حالياً.',
        'hero.closed_desc': 'يمكنك تصفح القائمة بكل حرية. سنستقبل طلباتكم فور الافتتاح.',

        // Sections
        'sections.promotions': 'العروض الخاصة',
        'sections.promotions_sub': 'ركب حسب ذوقك وشهوتك.',
        'sections.bestseller': 'الأكثر طلباً',
        'sections.bestseller_sub': 'اختيارات BIGTAC المفضلة عند الجميع.',
        'sections.menu': 'قائمتنا',
        'sections.menu_sub': 'تاكوس، غراتيني، برغر… الاختيار لك.',
        'search.placeholder': 'تاكوس، برغر…',
        'search.clear': 'مسح البحث',
        'search.label': 'ابحث في القائمة',
        'filter.all': 'الكل',

        // Product Badges
        'badge.popular': 'الأكثر طلباً',
        'badge.offer': 'عرض خاص',
        'badge.soldout': 'نفذ من المخزون',
        'badge.new': 'جديد',

        // Customization Modal
        'modal.choose': 'اختيار',
        'modal.composer': 'تركيب',
        'modal.close': 'إغلاق النافذة',
        'modal.size_required': 'اختر الحجم المناسب *',
        'modal.size_title': 'الحجم',
        'modal.supplements_title': 'الإضافات والمشروبات',
        'modal.instructions_title': 'ملاحظات خاصة',
        'modal.instructions_placeholder': 'بدون بصل، الصلصة على حدة…',
        'modal.add_to_cart': 'أضف إلى السلة',
        'modal.complete_choices': 'أكمل اختياراتك',
        'modal.ready_hint': 'كل شيء جاهز. أضف وجبتك إلى السلة.',
        'modal.default_hint': 'خصص وجبتك حسب رغبتك.',
        'modal.missing_choice': 'يرجى تحديد : ',
        'modal.from_price': 'ابتداءً من',
        'modal.required': 'إجباري',
        'modal.optional': 'اختياري',
        'modal.quantity': 'الكمية',

        // Cart
        'cart.title': 'سلتي',
        'cart.step': 'اختياراتك',
        'cart.empty_title': 'سلتك فارغة',
        'cart.empty_desc': 'أضف أشهى التاكوس والمشروبات والحلويات لبدء وجبتك.',
        'cart.subtotal': 'المجموع الجزئي',
        'cart.delivery': 'التوصيل',
        'cart.total': 'المجموع الإجمالي',
        'cart.checkout': 'إتمام الطلب',
        'cart.clear': 'إفراغ السلة',
        'cart.edit': 'تعديل',
        'cart.remove': 'حذف',
        'cart.empty_badge': '0 درهم',
        'cart.discover': 'تصفح القائمة',
        'cart.add_more': 'إضافة المزيد',
        'cart.view_cart': 'عرض السلة',
        'cart.fee_notice': 'تضاف رسوم التوصيل حسب الحي الذي تقيم فيه.',

        // Service Modal
        'service.step': '2 / 3 · طريقة الاستلام',
        'service.title': 'كيف تفضل استلام وجبتك؟',
        'service.delivery': 'توصيل',
        'service.delivery_sub': 'في فاس، ابتداءً من 4 دراهم حسب حيك',
        'service.takeaway': 'للأخذ',
        'service.takeaway_sub': 'استلم طلبك مباشرة من المطعم',
        'service.dinein': 'في المطعم',
        'service.dinein_sub': 'تناول وجبتك داخل المطعم',
        'service.back_coords': 'الرجوع للمعلومات الشخصية',

        // Delivery & GPS Modal
        'delivery.step': '2 / 3 · التوصيل',
        'delivery.modal_title': 'عنوان التوصيل في فاس',
        'delivery.modal_sub': 'شارك موقعك عبر GPS بنقرة واحدة أو اكتب عنوانك. سيؤكد المطعم معك عبر الهاتف.',
        'delivery.gps_btn': '📍 استخدام موقعي الحالي (GPS)',
        'delivery.gps_locating': '📍 جارٍ تحديد إحداثيات GPS…',
        'delivery.gps_success': '✅ تم تحديد موقع GPS بنجاح!',
        'delivery.gps_error': 'تعذر الوصول للموقع. يرجى كتابة عنوانك في الأسفل.',
        'delivery.address_label': 'عنوان التوصيل بالتفصيل',
        'delivery.address_sub': 'تأكيد عبر الهاتف',
        'delivery.address_placeholder': 'الحي، الشارع، رقم العمارة، الطابق، نقطة علام معروفة…',
        'delivery.fee_note': 'رسوم التوصيل :',
        'delivery.fee_val': '4,00 درهم',
        'delivery.confirm_btn': 'تأكيد العنوان',
        'delivery.change_service': 'تغيير طريقة الاستلام',
        'delivery.hint_default': 'حدد عنوانك بدقة لإرسال الطلب إليك.',

        // Checkout Name Modal
        'checkout.step': '1 / 3 · معلومات الاتصال',
        'checkout.title': 'لمن نحضر هذا الطلب؟',
        'checkout.sub': 'الاسم ورقم الهاتف للتواصل معك بخصوص الطلب وتأكيده.',
        'checkout.name_label': 'اسمك الكامل',
        'checkout.name_placeholder': 'مثال: أمين بناني',
        'checkout.phone_label': 'رقم الهاتف',
        'checkout.phone_placeholder': 'مثال: 0612345678',
        'checkout.note_label': 'أي ملاحظات إضافية؟',
        'checkout.note_placeholder': 'بدون بصل، تفاصيل العنوان، الجرس…',
        'checkout.note_allergy': 'في حالة وجود حساسية غذائية، يرجى إخبار المطعم أيضاً.',
        'checkout.required': 'إجباري',
        'checkout.optional': 'اختياري',
        'checkout.btn_next': 'اختيار طريقة الاستلام',
        'checkout.btn_back_cart': 'الرجوع إلى السلة',

        // Summary Modal
        'summary.step': '3 / 3 · تأكيد الطلب',
        'summary.title': 'كل شيء مضبوط؟',
        'summary.for_you': 'معلوماتك',
        'summary.reception': 'طريقة الاستلام',
        'summary.table_number': 'رقم الطاولة',
        'summary.edit': 'تعديل',
        'summary.your_meal': 'وجبتك',
        'summary.delivery': 'التوصيل',
        'summary.total_to_pay': 'المجموع النهائي',
        'summary.hint': 'سيتصل بك المطعم لتأكيد تفاصيل الطلب والتوصيل.',
        'summary.finalize': 'تأكيد الطلب',
        'summary.edit_cart': 'تعديل السلة',

        // Location & Hours
        'location.title': 'زورونا في فاس',
        'location.itinerary': 'الاتجاهات على الخريطة',
        'location.hours_title': 'أوقات العمل',
        'location.hours_val': 'طيلة أيام الأسبوع، من 12:00 إلى 02:00',
        'location.question': 'أي استفسار عن طلبك أو قائمتنا؟',
        'location.whatsapp': 'واتساب',
        'location.call': 'اتصل بنا',

        // Desktop Basket Preview
        'desktop_basket.title': 'استراحة شهية',
        'desktop_basket.sub_empty': 'اختر أطباقك المفضلة، ودع الباقي علينا.',
        'desktop_basket.total': 'المجموع',
        'desktop_basket.btn': 'عرض السلة',
        'desktop_basket.note': 'رسوم التوصيل تضاف بدقة عند تأكيد الطلب.',

        // Footer
        'footer.desc': 'تاكوس ومشويات في فاس',

        // Order Tracker
        'tracker.title': 'تتبع طلبك',
        'tracker.status_pending': 'في انتظار تأكيد المطعم…',
        'tracker.status_prep': 'قيد التحضير في المطبخ ! 👨‍🍳',
        'tracker.status_delivery': 'جاهز / في الطريق مع عامل التوصيل ! 🛵',
        'tracker.status_delivered': 'تم التوصيل بنجاح ! بالصحة والراحة 😋',
        'tracker.status_cancelled': 'تم إلغاء الطلب',
        'tracker.retry': 'إعادة محاولة التتبع',
        'tracker.close_aria': 'إغلاق نافذة التتبع',

        // Driver Interface
        'driver.header_title': 'BIGTAC التوصيل',
        'driver.header_subtitle': 'فضاء عامل التوصيل',
        'driver.logout_aria': 'تسجيل خروج السائق',
        'driver.tab_available': 'المتاحة',
        'driver.tab_deliveries': 'طلباتي',
        'driver.heading_available': 'طلبات جاهزة للاستلام',
        'driver.heading_deliveries': 'طلباتي قيد التوصيل',
        'driver.btn_take': 'استلام الطلب والتوصيل',
        'driver.btn_delivered': 'تم التسليم بنجاح',
        'driver.open_gps': 'فتح الموقع في الخريطة (GPS)',
        'driver.empty_available': 'لا توجد طلبات متاحة حالياً.',
        'driver.empty_deliveries': 'ليس لديك أي طلب قيد التوصيل حالياً.',

        // Admin Shell & General
        'admin.overview': 'نظرة عامة',
        'admin.orders': 'الطلبات',
        'admin.menu': 'القائمة والمنتجات',
        'admin.promotions': 'العروض',
        'admin.team': 'فريق العمل',
        'admin.settings': 'الإعدادات',
        'admin.logout': 'تسجيل الخروج',
        'admin.view_site': 'عرض موقع الزبائن',
        'admin.login_title': 'BIGTAC ستوديو',
        'admin.login_subtitle': 'تسجيل دخول الإدارة',
        'admin.email': 'البريد الإلكتروني',
        'admin.password': 'كلمة المرور',
        'admin.login_btn': 'دخول',
        'admin.login_error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        'admin.connecting': 'جارٍ الاتصال…'
    }
};

const LANG_STORAGE_KEY = 'bigtac_lang';

export const i18n = {
    translations,

    /**
     * Get the active language (default: 'fr')
     */
    getLang() {
        try {
            const saved = localStorage.getItem(LANG_STORAGE_KEY);
            if (saved && (saved === 'fr' || saved === 'en' || saved === 'ar')) {
                return saved;
            }
        } catch (_) {}
        return 'fr';
    },

    /**
     * Get translation for a given key
     */
    t(key, fallback = '') {
        const lang = this.getLang();
        const dict = translations[lang] || translations.fr;
        if (dict && dict[key] !== undefined) {
            return dict[key];
        }
        if (translations.fr && translations.fr[key] !== undefined) {
            return translations.fr[key];
        }
        return fallback || key;
    },

    /**
     * Switch active language
     */
    setLang(lang) {
        if (!translations[lang]) lang = 'fr';
        try {
            localStorage.setItem(LANG_STORAGE_KEY, lang);
        } catch (_) {}

        if (typeof document === 'undefined') return;

        const root = document.documentElement;
        root.lang = lang;
        if (lang === 'ar') {
            root.dir = 'rtl';
            root.classList.add('is-rtl');
        } else {
            root.dir = 'ltr';
            root.classList.remove('is-rtl');
        }

        // Update all text nodes with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // If element has a designated child target, update only that
                const textTarget = el.querySelector('[data-i18n-text]') || el;
                // If it contains direct child icons or svg, only update the text node
                if (el.querySelector('svg, i[data-feather]')) {
                    let updated = false;
                    for (const node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = (lang === 'ar' ? ' ' : ' ') + translation + ' ';
                            updated = true;
                            break;
                        }
                    }
                    if (!updated) {
                        // Fallback: prepend translation before svg
                        const svg = el.querySelector('svg, i[data-feather]');
                        if (svg) {
                            const tn = document.createTextNode(translation + ' ');
                            el.insertBefore(tn, svg);
                        }
                    }
                } else {
                    textTarget.textContent = translation;
                }
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) el.setAttribute('placeholder', translation);
        });

        // Update ARIA labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = this.t(key);
            if (translation) el.setAttribute('aria-label', translation);
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) el.setAttribute('title', translation);
        });

        // Update language buttons active state
        document.querySelectorAll('[data-lang-btn]').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang-btn');
            if (btnLang === lang) {
                btn.classList.add('active', 'font-black', 'text-brand-600');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active', 'font-black', 'text-brand-600');
                btn.setAttribute('aria-pressed', 'false');
            }
        });

        // Update current language label display
        document.querySelectorAll('.current-lang-code').forEach(label => {
            label.textContent = lang.toUpperCase();
        });

        // Close any open language dropdowns and reset aria-expanded
        document.querySelectorAll('.lang-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));

        // Dispatch language change event for dynamic renderers
        window.dispatchEvent(new CustomEvent('bigtac:langchange', { detail: { lang } }));
    },

    /**
     * Initial binding on page load
     */
    init() {
        const lang = this.getLang();
        this.setLang(lang);
    }
};

// Global attachment for non-module scripts
if (typeof window !== 'undefined') {
    window.i18n = i18n;
    window.setAppLanguage = function(lang) {
        i18n.setLang(lang);
    };
    window.toggleLangMenu = function(id = 'langDropdown') {
        const dd = document.getElementById(id);
        if (dd) {
            dd.classList.toggle('hidden');
            const btn = dd.previousElementSibling?.closest('.lang-selector')?.querySelector('.lang-toggle-btn');
            if (btn) {
                btn.setAttribute('aria-expanded', String(!dd.classList.contains('hidden')));
            }
        }
    };
    // Close dropdown on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.lang-selector')) {
            document.querySelectorAll('.lang-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
            document.querySelectorAll('.lang-toggle-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        }
    });
}

export const t = (key, fallback) => i18n.t(key, fallback);
export { translations };
export default i18n;
