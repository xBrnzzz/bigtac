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
        'modal.missing_choice': 'Veuillez sélectionner : ',
        'modal.from_price': 'À partir de',

        // Cart
        'cart.title': 'Votre commande',
        'cart.empty_title': 'Votre panier est vide',
        'cart.empty_desc': 'Ajoutez vos tacos, boissons et desserts pour composer votre repas.',
        'cart.subtotal': 'Sous-total',
        'cart.delivery': 'Livraison',
        'cart.total': 'Total',
        'cart.checkout': 'Valider la commande',
        'cart.clear': 'Vider le panier',
        'cart.edit': 'Modifier',
        'cart.remove': 'Supprimer',
        'cart.empty_badge': '0 Dh',

        // Delivery & GPS Modal
        'delivery.modal_title': 'Où souhaitez-vous être livré ?',
        'delivery.modal_sub': 'Renseignez votre adresse ou utilisez votre position GPS automatique.',
        'delivery.gps_btn': '📍 Utiliser ma position GPS',
        'delivery.gps_locating': '📍 Détection de votre position GPS…',
        'delivery.gps_success': '✅ Position GPS enregistrée !',
        'delivery.gps_error': 'Impossible d’accéder au GPS. Veuillez saisir votre adresse ci-dessous.',
        'delivery.address_label': 'Adresse de livraison *',
        'delivery.address_placeholder': 'Quartier, rue, n° immeuble, appartement, repère…',
        'delivery.fee_note': 'Frais de livraison :',
        'delivery.fee_val': '4,00 Dh',
        'delivery.confirm_btn': 'Confirmer la livraison (4 Dh)',
        'delivery.client_details': 'Vos coordonnées',
        'delivery.name_label': 'Votre nom complet',
        'delivery.name_placeholder': 'Ex: Yassine El Amrani',
        'delivery.phone_label': 'Numéro de téléphone WhatsApp',
        'delivery.phone_placeholder': '06XXXXXXXX ou 07XXXXXXXX',

        // Order Tracker
        'tracker.title': 'Suivi de commande',
        'tracker.status_pending': 'Commande reçue',
        'tracker.status_prep': 'En préparation en cuisine',
        'tracker.status_delivery': 'En cours de livraison',
        'tracker.status_delivered': 'Commande livrée !',
        'tracker.status_cancelled': 'Commande annulée',

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

        // Customization Modal
        'modal.choose': 'Select',
        'modal.composer': 'Customize',
        'modal.close': 'Close window',
        'modal.size_required': 'Choose your size *',
        'modal.size_title': 'Size',
        'modal.supplements_title': 'Extras & Toppings',
        'modal.instructions_title': 'Special Instructions',
        'modal.instructions_placeholder': 'No onions, sauce on the side…',
        'modal.add_to_cart': 'Add to Cart',
        'modal.missing_choice': 'Please select: ',
        'modal.from_price': 'Starting from',

        // Cart
        'cart.title': 'Your Order',
        'cart.empty_title': 'Your cart is empty',
        'cart.empty_desc': 'Add delicious tacos, drinks, and desserts to start your feast.',
        'cart.subtotal': 'Subtotal',
        'cart.delivery': 'Delivery',
        'cart.total': 'Total',
        'cart.checkout': 'Proceed to Checkout',
        'cart.clear': 'Clear cart',
        'cart.edit': 'Edit',
        'cart.remove': 'Remove',
        'cart.empty_badge': '0 Dh',

        // Delivery & GPS Modal
        'delivery.modal_title': 'Where should we deliver?',
        'delivery.modal_sub': 'Enter your address or use 1-tap GPS location.',
        'delivery.gps_btn': '📍 Use My GPS Location',
        'delivery.gps_locating': '📍 Detecting GPS coordinates…',
        'delivery.gps_success': '✅ GPS location captured!',
        'delivery.gps_error': 'Unable to access GPS. Please type your delivery address below.',
        'delivery.address_label': 'Delivery Address *',
        'delivery.address_placeholder': 'Neighborhood, street, building number, floor, landmark…',
        'delivery.fee_note': 'Delivery fee:',
        'delivery.fee_val': '4.00 Dh',
        'delivery.confirm_btn': 'Confirm Delivery (4 Dh)',
        'delivery.client_details': 'Contact Details',
        'delivery.name_label': 'Your Full Name',
        'delivery.name_placeholder': 'e.g. John Doe',
        'delivery.phone_label': 'WhatsApp Phone Number',
        'delivery.phone_placeholder': '06XXXXXXXX or 07XXXXXXXX',

        // Order Tracker
        'tracker.title': 'Order Tracking',
        'tracker.status_pending': 'Order Received',
        'tracker.status_prep': 'Preparing in Kitchen',
        'tracker.status_delivery': 'Out for Delivery',
        'tracker.status_delivered': 'Order Delivered!',
        'tracker.status_cancelled': 'Order Cancelled',

        // Driver Interface
        'driver.header_title': 'BIGTAC Delivery',
        'driver.header_subtitle': 'Driver Portal',
        'driver.logout_aria': 'Driver Logout',
        'driver.tab_available': 'Available',
        'driver.tab_deliveries': 'My Runs',
        'driver.heading_available': 'Available Orders to Pickup',
        'driver.heading_deliveries': 'My Active Deliveries',
        'driver.btn_take': 'Accept Order',
        'driver.btn_delivered': 'Mark as Delivered',
        'driver.open_gps': 'Open GPS / Maps',
        'driver.empty_available': 'No orders currently available.',
        'driver.empty_deliveries': 'You have no active runs right now.',

        // Admin Shell & General
        'admin.overview': 'Overview',
        'admin.orders': 'Orders',
        'admin.menu': 'Menu & Products',
        'admin.promotions': 'Promotions',
        'admin.team': 'Team & Drivers',
        'admin.settings': 'Settings',
        'admin.logout': 'Logout',
        'admin.view_site': 'View Storefront',
        'admin.login_title': 'BIGTAC Studio',
        'admin.login_subtitle': 'Staff Management Login',
        'admin.email': 'Email',
        'admin.password': 'Password',
        'admin.login_btn': 'Sign In',
        'admin.login_error': 'Invalid email or password.',
        'admin.connecting': 'Connecting…'
    },

    ar: {
        // Navigation & Header
        'nav.skip': 'الانتقال إلى القائمة',
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
        'modal.missing_choice': 'يرجى تحديد : ',
        'modal.from_price': 'ابتداءً من',

        // Cart
        'cart.title': 'طلبك الحالي',
        'cart.empty_title': 'سلتك فارغة',
        'cart.empty_desc': 'أضف أشهى التاكوس والمشروبات والحلويات لبدء وجبتك.',
        'cart.subtotal': 'المجموع الجزئي',
        'cart.delivery': 'التوصيل',
        'cart.total': 'المجموع الإجمالي',
        'cart.checkout': 'تأكيد الطلب',
        'cart.clear': 'إفراغ السلة',
        'cart.edit': 'تعديل',
        'cart.remove': 'حذف',
        'cart.empty_badge': '0 درهم',

        // Delivery & GPS Modal
        'delivery.modal_title': 'أين تريد استلام طلبك؟',
        'delivery.modal_sub': 'أدخل عنوانك أو حدد موقعك الحالي بنقرة واحدة عبر GPS.',
        'delivery.gps_btn': '📍 استخدام موقعي الحالي (GPS)',
        'delivery.gps_locating': '📍 جارٍ تحديد إحداثيات GPS…',
        'delivery.gps_success': '✅ تم تحديد موقع GPS بنجاح!',
        'delivery.gps_error': 'تعذر الوصول للموقع. يرجى كتابة عنوانك في الأسفل.',
        'delivery.address_label': 'عنوان التوصيل *',
        'delivery.address_placeholder': 'الحي، الشارع، رقم العمارة، الطابق، نقطة علام معروفة…',
        'delivery.fee_note': 'رسوم التوصيل :',
        'delivery.fee_val': '4,00 درهم',
        'delivery.confirm_btn': 'تأكيد التوصيل (4 دراهم)',
        'delivery.client_details': 'معلومات الاتصال',
        'delivery.name_label': 'الاسم الكامل',
        'delivery.name_placeholder': 'مثال: ياسين العمراني',
        'delivery.phone_label': 'رقم هاتف الواتساب',
        'delivery.phone_placeholder': '06XXXXXXXX أو 07XXXXXXXX',

        // Order Tracker
        'tracker.title': 'تتبع الطلب',
        'tracker.status_pending': 'تم استلام الطلب',
        'tracker.status_prep': 'قيد التحضير في المطبخ',
        'tracker.status_delivery': 'في طريق التوصيل إليك',
        'tracker.status_delivered': 'تم تسليم الطلب بنجاح!',
        'tracker.status_cancelled': 'تم إلغاء الطلب',

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
     * Translate a key with optional fallback
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
     * Switch active language and update the entire DOM
     */
    setLang(lang) {
        if (!translations[lang]) lang = 'fr';
        try {
            localStorage.setItem(LANG_STORAGE_KEY, lang);
        } catch (_) {}

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
                // Check if element has child elements that shouldn't be wiped (e.g. icons)
                const textTarget = el.querySelector('[data-i18n-text]') || el;
                // If it contains direct child icons or svg, only update text nodes
                if (el.querySelector('svg, i[data-feather]')) {
                    for (const node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = (lang === 'ar' ? ' ' : ' ') + translation + ' ';
                            break;
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
        // If lang is 'fr', don't alter text unless necessary, but set dir/lang
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
        }
    };
    // Close dropdown on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.lang-selector')) {
            document.querySelectorAll('.lang-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
        }
    });
}

export const t = (key, fallback) => i18n.t(key, fallback);
export default i18n;
