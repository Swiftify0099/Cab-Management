/**
 * Customer App — Localization Engine (i18n)
 * Supports English (en), Hindi (hi), and Marathi (mr).
 * Usage:
 *   import { useTranslation } from '@/i18n'
 *   const { t, language, setLanguage } = useTranslation()
 */
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type LanguageCode = 'en' | 'hi' | 'mr'

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English (US)' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
]

const LANGUAGE_KEY = '@customer_app_language'

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Navigation & General
    'common.back': 'Back',
    'common.save': 'Save Changes',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.coming_soon': 'Coming Soon',

    // Profile & Account
    'profile.title': 'My Account',
    'profile.edit_profile': 'Edit Profile',
    'profile.personal_info': 'Personal Information',
    'profile.full_name': 'Full Name',
    'profile.email': 'Email Address',
    'profile.phone': 'Phone Number',
    'profile.gender': 'Gender',
    'profile.dob': 'Date of Birth',
    'profile.verified': 'Verified',
    'profile.unverified': 'Unverified',
    'profile.rating': 'Rating',
    'profile.trips': 'Trips',
    'profile.parcels': 'Parcels',

    // Quick Actions
    'quick.saved_places': 'Saved Places',
    'quick.family': 'Family & Shared',
    'quick.safety': 'Safety & Emergency',
    'quick.wallet': 'Wallet & Payments',

    // Home & Service Discovery (Feature 2)
    'home.greeting_morning': 'Good Morning,',
    'home.greeting_afternoon': 'Good Afternoon,',
    'home.greeting_evening': 'Good Evening,',
    'home.where_to': 'Where are you heading today?',
    'home.location_loading': 'Pinpointing current location...',
    'home.location_permission_needed': 'Enable GPS location for accurate pickup',
    'home.location_enable_btn': 'Enable GPS',
    'home.active_ride': 'Active Ride in Progress',
    'home.upcoming_booking': 'Upcoming Reservation',
    'home.services_title': 'Explore Services',
    'home.more_services': 'More Services',
    'home.saved_shortcuts': 'Saved Shortcuts',
    'home.recent_destinations': 'Recent Destinations',
    'home.offers_title': 'Exclusive Offers & Discounts',
    'home.service_coming_soon_title': 'Service Launching Soon!',
    'home.service_coming_soon_desc': 'We are expanding to your route very soon. Stay tuned!',
    'home.call_driver': 'Call Driver',
    'home.track_live': 'Live GPS Tracking',
    'home.otp_label': 'Start PIN / OTP',

    // Ride Booking & Categories (Feature 3)
    'ride.title': 'Book Intercity Ride',
    'ride.one_way': 'One-Way',
    'ride.round_trip': 'Round-Trip',
    'ride.rental': 'Rental',
    'ride.pickup_placeholder': 'Enter pickup location...',
    'ride.drop_placeholder': 'Enter drop destination...',
    'ride.use_current_loc': 'Use Current Location',
    'ride.hatchback': 'Mini / Hatchback',
    'ride.sedan': 'Comfort Sedan',
    'ride.suv': 'Spacious SUV (7-Seater)',
    'ride.premium': 'Executive Prime',
    'ride.surge_active': 'High Demand Surge',
    'ride.book_for': 'Booking For',
    'ride.self': 'Myself',
    'ride.family_member': 'Family / Guest',
    'ride.schedule_time': 'Schedule Ride',
    'ride.leave_now': 'Leave Now',
    'ride.women_only': 'Women-Only Driver Preference',
    'ride.priority': 'Priority / Emergency Dispatch',
    'ride.fare_details': 'Fare Breakdown',
    'ride.promo_code': 'Apply Promo Code',
    'ride.book_now': 'Confirm & Book Cab',
    'ride.searching_driver': 'Connecting to nearby drivers...',
    'ride.seats_label': 'Seats Required',
    'ride.distance_eta': 'Distance & Travel Duration',

    // Schedule / Reserve (Feature 4)
    'schedule.title': 'Schedule Advance Reservation',
    'schedule.book_now': 'Book Now',
    'schedule.schedule_later': 'Schedule Later',
    'schedule.pick_date': 'Select Date',
    'schedule.pick_time': 'Select Time',
    'schedule.today': 'Today',
    'schedule.tomorrow': 'Tomorrow',
    'schedule.custom_date': 'Choose Custom Date',
    'schedule.min_lead_time_notice': 'Advance reservations require at least 45 minutes lead time.',
    'schedule.max_advance_notice': 'You can book rides up to 7 days in advance.',
    'schedule.confirmed_title': 'Reservation Confirmed! 🎉',
    'schedule.confirmed_desc': 'Your ride is reserved. A top-rated driver will be dispatched 45 mins before pickup.',
    'schedule.view_reservations': 'View in Upcoming Trips',
    'schedule.modify_reservation': 'Modify Reservation',
    'schedule.modify_title': 'Modify Scheduled Pickup',
    'schedule.modify_confirm': 'Confirm Changes',
    'schedule.fare_difference': 'Fare Adjustment',
    'schedule.cancel_policy': 'Free cancellation up to 2 hours before pickup. A 20% cancellation fee applies if cancelled within dispatch window.',

    // Negotiation / Own Fare Model (Feature 5)
    'negotiation.title': 'Negotiate Your Fare',
    'negotiation.pricing_mode': 'Pricing Mode',
    'negotiation.standard_fare': 'Platform Standard Fare',
    'negotiation.your_offer': 'Your Offer (Negotiate 🤝)',
    'negotiation.suggested_range': 'Suggested Offer Range',
    'negotiation.send_offer': 'Send Offer to Nearby Drivers',
    'negotiation.waiting_title': 'Broadcasting Your Offer...',
    'negotiation.waiting_subtitle': 'Nearby drivers are reviewing your fare proposal. You can compare incoming offers below.',
    'negotiation.driver_offers_title': 'Live Driver Offers & Bids',
    'negotiation.accept_offer': 'Accept & Ride',
    'negotiation.counter_offer_badge': 'Counter-Offer',
    'negotiation.exact_match_badge': 'Accepted Your Offer!',
    'negotiation.best_price_badge': '🔥 Best Price',
    'negotiation.fallback_btn': 'Switch to Standard Dispatch (₹{fare})',
    'negotiation.fallback_desc': 'No driver accepted yet? Instantly switch to standard platform matching.',
    'negotiation.time_remaining': 'Time Remaining',

    // Live Tracking & Matching (Feature 4)
    'track.title': 'Live Ride Tracking',
    'track.driver_assigned': 'Driver Assigned',
    'track.driver_arrived': 'Driver Arrived',
    'track.in_progress': 'Trip in Progress',
    'track.completed': 'Arrived at Destination',
    'track.otp_instruction': 'Share this PIN with driver ONLY after entering cab',
    'track.call_driver': 'Call Driver',
    'track.chat_driver': 'Chat',
    'track.sos_alert': 'Emergency SOS',
    'track.sos_desc': 'Send emergency alert & live GPS link to your trusted contacts and dial 112',
    'track.share_trip': 'Share Live Trip',
    'track.cancel_ride': 'Cancel Ride',
    'track.cancel_reason_title': 'Why do you want to cancel?',
    'track.cancel_reason_1': 'Driver is taking too long to arrive',
    'track.cancel_reason_2': 'Driver asked me to cancel',
    'track.cancel_reason_3': 'Changed my travel plans',
    'track.cancel_reason_4': 'Booked by mistake / wrong address',
    'track.cancel_reason_5': 'Found another ride / vehicle',
    'track.cancel_confirm': 'Confirm Cancellation',
    'track.radar_title': 'Searching Nearby Drivers...',
    'track.radar_subtitle': 'Broadcasting your ride request to top-rated drivers nearby',

    // Family
    'family.title': 'Family & Shared Account',
    'family.group_name': 'Family Group',
    'family.organizer': 'Family Organizer',
    'family.members': 'Family Members',
    'family.add_member': 'Add Family Member',
    'family.shared_payment': 'Shared Payment Method',
    'family.shared_payment_desc': 'Allow family members to ride using your wallet/saved cards',
    'family.permissions': 'Permissions',
    'family.can_book': 'Can book rides',
    'family.can_pay': 'Can use family payment',
    'family.can_track': 'Can track family rides',
    'family.remove_member': 'Remove Member',
    'family.remove_confirm': 'Are you sure you want to remove this family member?',

    // Safety & Emergency
    'safety.title': 'Emergency & Trusted Contacts',
    'safety.add_contact': 'Add Emergency Contact',
    'safety.primary': 'Primary Contact',
    'safety.auto_share': 'Auto-share Live Trips',
    'safety.desc': 'Trusted contacts receive instant SOS notifications and live GPS tracking when you travel.',

    // Saved Addresses & Places (Feature 2)
    'address.title': 'Saved Places & Addresses',
    'address.add_new': 'Add New Address',
    'address.saved_routes': 'Saved Routes',
    'address.add_route': 'Add Saved Route',
    'address.no_addresses': 'No saved places yet',
    'address.no_routes': 'No saved routes yet',
    'address.home': 'Home',
    'address.work': 'Work',
    'address.gym': 'Gym',
    'address.partner': 'Partner',
    'address.other': 'Other',
    'address.search_placeholder': 'Search location, area, or landmark...',
    'address.confirm_location': 'Confirm Location',
    'address.recent_searches': 'Recent Searches',
    'address.clear_history': 'Clear History',
    'address.save_as': 'Save Place As',
    'address.flat_building': 'House / Flat / Building Name & Landmark',
    'address.delete_confirm': 'Are you sure you want to delete this saved place?',
    'address.delete_route_confirm': 'Are you sure you want to delete this saved route?',

    // Settings & Privacy
    'settings.title': 'App Settings',
    'settings.preferences': 'Preferences',
    'settings.dark_mode': 'Dark Mode',
    'settings.dark_mode_desc': 'Sleek obsidian night theme',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy & Security',
    'settings.language': 'Language',
    'settings.sessions': 'Devices & Active Sessions',
    'settings.about': 'About App',

    // Sessions
    'sessions.title': 'Active Devices & Sessions',
    'sessions.current': 'Current Device',
    'sessions.revoke': 'Revoke Session',
    'sessions.logout_all': 'Log Out All Devices',

    // Danger Zone
    'danger.title': 'Danger Zone',
    'danger.logout': 'Log Out',
    'danger.logout_confirm': 'Are you sure you want to log out of your account?',
    'danger.delete_account': 'Delete Account',
    'danger.delete_warning': 'Permanently deactivate your customer profile and revoke all active sessions.',
  },
  hi: {
    // Navigation & General
    'common.back': 'वापस',
    'common.save': 'बदलाव सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.confirm': 'पुष्टि करें',
    'common.loading': 'लोड हो रहा है...',
    'common.success': 'सफल',
    'common.error': 'त्रुटि',
    'common.coming_soon': 'जल्द आ रहा है',

    // Profile & Account
    'profile.title': 'मेरा खाता',
    'profile.edit_profile': 'प्रोफाइल संपादित करें',
    'profile.personal_info': 'व्यक्तिगत जानकारी',
    'profile.full_name': 'पूरा नाम',
    'profile.email': 'ईमेल पता',
    'profile.phone': 'फ़ोन नंबर',
    'profile.gender': 'लिंग',
    'profile.dob': 'जन्म तिथि',
    'profile.verified': 'सत्यापित',
    'profile.unverified': 'असत्यापित',
    'profile.rating': 'रेटिंग',
    'profile.trips': 'यात्राएं',
    'profile.parcels': 'पार्सल',

    // Quick Actions
    'quick.saved_places': 'सहेजे गए स्थान',
    'quick.family': 'परिवार और साझा खाता',
    'quick.safety': 'सुरक्षा और आपातकालीन',
    'quick.wallet': 'वॉलेट और भुगतान',

    // Home & Service Discovery (Feature 2)
    'home.greeting_morning': 'शुभ प्रभात,',
    'home.greeting_afternoon': 'शुभ दोपहर,',
    'home.greeting_evening': 'शुभ संध्या,',
    'home.where_to': 'आज आप कहाँ जाना चाहते हैं?',
    'home.location_loading': 'वर्तमान स्थान खोजा जा रहा है...',
    'home.location_permission_needed': 'सटीक पिकअप के लिए GPS लोकेशन चालू करें',
    'home.location_enable_btn': 'GPS सक्षम करें',
    'home.active_ride': 'सक्रिय सवारी जारी है',
    'home.upcoming_booking': 'आगामी आरक्षण',
    'home.services_title': 'सेवाएं देखें',
    'home.more_services': 'अधिक सेवाएं',
    'home.saved_shortcuts': 'सहेजे गए शॉर्टकट',
    'home.recent_destinations': 'हाल की मंजिलें',
    'home.offers_title': 'विशेष छूट और ऑफर्स',
    'home.service_coming_soon_title': 'सेवा जल्द शुरू हो रही है!',
    'home.service_coming_soon_desc': 'हम बहुत जल्द इस रूट पर सेवा शुरू कर रहे हैं। बने रहें!',
    'home.call_driver': 'चालक को कॉल करें',
    'home.track_live': 'लाइव GPS ट्रैकिंग',
    'home.otp_label': 'प्रारंभ PIN / OTP',

    // Ride Booking & Categories (Feature 3)
    'ride.title': 'इंटरसिटी सवारी बुक करें',
    'ride.one_way': 'एक तरफ',
    'ride.round_trip': 'आना-जाना',
    'ride.rental': 'किराया',
    'ride.pickup_placeholder': 'पिकअप स्थान दर्ज करें...',
    'ride.drop_placeholder': 'गंतव्य स्थान दर्ज करें...',
    'ride.use_current_loc': 'वर्तमान स्थान का उपयोग करें',
    'ride.hatchback': 'मिनी / हैचबैक',
    'ride.sedan': 'आरामदायक सेडान',
    'ride.suv': 'बड़ी एसयूवी (7-सीटर)',
    'ride.premium': 'प्रीमियम प्राइम',
    'ride.surge_active': 'उच्च मांग वृद्धि',
    'ride.book_for': 'सवारी किसके लिए है',
    'ride.self': 'स्वयं',
    'ride.family_member': 'परिवार / अतिथि',
    'ride.schedule_time': 'सवारी शेड्यूल करें',
    'ride.leave_now': 'अभी निकलें',
    'ride.women_only': 'महिला चालक प्राथमिकता',
    'ride.priority': 'प्राथमिकता / आपातकालीन प्रेषण',
    'ride.fare_details': 'किराया विवरण',
    'ride.promo_code': 'प्रोमो कोड लागू करें',
    'ride.book_now': 'कैब बुक करें',
    'ride.searching_driver': 'निकटतम चालकों से संपर्क किया जा रहा है...',
    'ride.seats_label': 'सीटों की संख्या',
    'ride.distance_eta': 'दूरी और यात्रा समय',

    // Schedule / Reserve (Feature 4)
    'schedule.title': 'अग्रिम आरक्षण शेड्यूल करें',
    'schedule.book_now': 'अभी बुक करें',
    'schedule.schedule_later': 'बाद के लिए शेड्यूल करें',
    'schedule.pick_date': 'तारीख चुनें',
    'schedule.pick_time': 'समय चुनें',
    'schedule.today': 'आज',
    'schedule.tomorrow': 'कल',
    'schedule.custom_date': 'अन्य तारीख चुनें',
    'schedule.min_lead_time_notice': 'अग्रिम आरक्षण के लिए कम से कम 45 मिनट पहले बुकिंग आवश्यक है।',
    'schedule.max_advance_notice': 'आप 7 दिन पहले तक सवारी शेड्यूल कर सकते हैं।',
    'schedule.confirmed_title': 'आरक्षण की पुष्टि हो गई! 🎉',
    'schedule.confirmed_desc': 'आपकी सवारी आरक्षित है। पिकअप से 45 मिनट पहले चालक नियुक्त किया जाएगा।',
    'schedule.view_reservations': 'आगामी यात्राएं देखें',
    'schedule.modify_reservation': 'आरक्षण संशोधित करें',
    'schedule.modify_title': 'पिकअप समय बदलें',
    'schedule.modify_confirm': 'बदलाव की पुष्टि करें',
    'schedule.fare_difference': 'किराया समायोजन',
    'schedule.cancel_policy': 'पिकअप से 2 घंटे पहले तक निःशुल्क रद्दीकरण।',

    // Negotiation / Own Fare Model (Feature 5)
    'negotiation.title': 'किराया तय करें (मोलभाव)',
    'negotiation.pricing_mode': 'मूल्य निर्धारण मोड',
    'negotiation.standard_fare': 'मानक प्लेटफ़ॉर्म किराया',
    'negotiation.your_offer': 'आपका प्रस्ताव (मोलभाव 🤝)',
    'negotiation.suggested_range': 'सुझाया गया किराया दायरा',
    'negotiation.send_offer': 'चालकों को प्रस्ताव भेजें',
    'negotiation.waiting_title': 'आपका प्रस्ताव भेजा जा रहा है...',
    'negotiation.waiting_subtitle': 'पास के चालक आपके प्रस्ताव की समीक्षा कर रहे हैं। नीचे बोलियां देखें।',
    'negotiation.driver_offers_title': 'चालकों के प्रस्ताव और बोलियां',
    'negotiation.accept_offer': 'स्वीकार करें और सवारी शुरू करें',
    'negotiation.counter_offer_badge': 'चालक का प्रति-प्रस्ताव',
    'negotiation.exact_match_badge': 'प्रस्ताव स्वीकार किया गया!',
    'negotiation.best_price_badge': '🔥 सर्वोत्तम मूल्य',
    'negotiation.fallback_btn': 'मानक दर पर चालक खोजें (₹{fare})',
    'negotiation.fallback_desc': 'तुरंत मानक प्लेटफ़ॉर्म दर पर बुकिंग जारी रखें।',
    'negotiation.time_remaining': 'शेष समय',

    // Live Tracking & Matching (Feature 4)
    'track.title': 'लाइव सवारी ट्रैकिंग',
    'track.driver_assigned': 'चालक नियुक्त',
    'track.driver_arrived': 'चालक पहुँच गया',
    'track.in_progress': 'सवारी जारी है',
    'track.completed': 'मंजिल पर पहुंचे',
    'track.otp_instruction': 'कैब में बैठने के बाद ही यह पिन चालक को बताएं',
    'track.call_driver': 'चालक को कॉल करें',
    'track.chat_driver': 'चैट करें',
    'track.sos_alert': 'आपातकालीन SOS',
    'track.sos_desc': 'अपने संपर्कों को लाइव लोकेशन भेजें और 112 डायल करें',
    'track.share_trip': 'लाइव यात्रा साझा करें',
    'track.cancel_ride': 'सवारी रद्द करें',
    'track.cancel_reason_title': 'रद्द करने का कारण चुनें',
    'track.cancel_reason_1': 'चालक आने में बहुत देर कर रहा है',
    'track.cancel_reason_2': 'चालक ने रद्द करने को कहा',
    'track.cancel_reason_3': 'यात्रा योजना बदल गई',
    'track.cancel_reason_4': 'गलत पता दर्ज हो गया',
    'track.cancel_reason_5': 'अन्य साधन मिल गया',
    'track.cancel_confirm': 'रद्द करने की पुष्टि करें',
    'track.radar_title': 'निकटतम चालक खोज रहे हैं...',
    'track.radar_subtitle': 'आपकी सवारी का अनुरोध पास के चालकों को भेजा जा रहा है',

    // Family
    'family.title': 'परिवार और साझा खाता',
    'family.group_name': 'पारिवारिक समूह',
    'family.organizer': 'परिवार आयोजक',
    'family.members': 'परिवार के सदस्य',
    'family.add_member': 'सदस्य जोड़ें',
    'family.shared_payment': 'साझा भुगतान विधि',
    'family.shared_payment_desc': 'परिवार के सदस्यों को अपने वॉलेट से सवारी करने दें',
    'family.permissions': 'अनुमतियां',
    'family.can_book': 'सवारी बुक कर सकते हैं',
    'family.can_pay': 'साझा भुगतान का उपयोग कर सकते हैं',
    'family.can_track': 'सवारी ट्रैक कर सकते हैं',
    'family.remove_member': 'सदस्य हटाएं',
    'family.remove_confirm': 'क्या आप इस सदस्य को परिवार से हटाना चाहते हैं?',

    // Safety & Emergency
    'safety.title': 'आपातकालीन और विश्वसनीय संपर्क',
    'safety.add_contact': 'आपातकालीन संपर्क जोड़ें',
    'safety.primary': 'मुख्य संपर्क',
    'safety.auto_share': 'लाइव यात्रा स्वतः साझा करें',
    'safety.desc': 'यात्रा के दौरान आपातकालीन संपर्कों को तुरंत सूचना और लाइव लोकेशन भेजी जाती है।',

    // Saved Addresses & Places (Feature 2)
    'address.title': 'सहेजे गए स्थान और पते',
    'address.add_new': 'नया पता जोड़ें',
    'address.saved_routes': 'सहेजे गए मार्ग',
    'address.add_route': 'मार्ग सहेजें',
    'address.no_addresses': 'कोई सहेजा हुआ स्थान नहीं',
    'address.no_routes': 'कोई सहेजा हुआ मार्ग नहीं',
    'address.home': 'घर',
    'address.work': 'कार्यालय',
    'address.gym': 'जिम',
    'address.partner': 'साथी का घर',
    'address.other': 'अन्य',
    'address.search_placeholder': 'स्थान, क्षेत्र या लैंडमार्क खोजें...',
    'address.confirm_location': 'स्थान की पुष्टि करें',
    'address.recent_searches': 'हाल की खोजें',
    'address.clear_history': 'इतिहास साफ़ करें',
    'address.save_as': 'स्थान का प्रकार',
    'address.flat_building': 'घर / फ्लैट / इमारत का नाम और लैंडमार्क',
    'address.delete_confirm': 'क्या आप वाकई इस सहेजे गए स्थान को हटाना चाहते हैं?',
    'address.delete_route_confirm': 'क्या आप वाकई इस सहेजे गए मार्ग को हटाना चाहते हैं?',

    // Settings & Privacy
    'settings.title': 'ऐप सेटिंग्स',
    'settings.preferences': 'प्राथमिकताएं',
    'settings.dark_mode': 'डार्क मोड',
    'settings.dark_mode_desc': 'आकर्षक डार्क थीम',
    'settings.notifications': 'सूचनाएं',
    'settings.privacy': 'गोपनीयता और सुरक्षा',
    'settings.language': 'भाषा',
    'settings.sessions': 'सक्रिय उपकरण और सत्र',
    'settings.about': 'ऐप के बारे में',

    // Sessions
    'sessions.title': 'सक्रिय उपकरण और सत्र',
    'sessions.current': 'वर्तमान उपकरण',
    'sessions.revoke': 'सत्र समाप्त करें',
    'sessions.logout_all': 'सभी उपकरणों से लॉग आउट करें',

    // Danger Zone
    'danger.title': 'अति संवेदनशील क्षेत्र',
    'danger.logout': 'लॉग आउट',
    'danger.logout_confirm': 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
    'danger.delete_account': 'खाता हटाएं',
    'danger.delete_warning': 'अपनी प्रोफ़ाइल निष्क्रिय करें और सभी सत्र रद्द करें।',
  },
  mr: {
    // Navigation & General
    'common.back': 'मागे',
    'common.save': 'बदल जतन करा',
    'common.cancel': 'रद्द करा',
    'common.delete': 'हटवा',
    'common.edit': 'संपादित करा',
    'common.confirm': 'पुष्टी करा',
    'common.loading': 'लोड होत आहे...',
    'common.success': 'यशस्वी',
    'common.error': 'त्रुटी',
    'common.coming_soon': 'लवकरच येत आहे',

    // Profile & Account
    'profile.title': 'माझे खाते',
    'profile.edit_profile': 'प्रोफाइल संपादित करा',
    'profile.personal_info': 'वैयक्तिक माहिती',
    'profile.full_name': 'पूर्ण नाव',
    'profile.email': 'ईमेल पत्ता',
    'profile.phone': 'फोन नंबर',
    'profile.gender': 'लिंग',
    'profile.dob': 'जन्मतारीख',
    'profile.verified': 'प्रमाणित',
    'profile.unverified': 'अप्रमाणित',
    'profile.rating': 'रेटिंग',
    'profile.trips': 'प्रवास',
    'profile.parcels': 'पार्सल',

    // Quick Actions
    'quick.saved_places': 'जतन केलेली ठिकाणे',
    'quick.family': 'कुटुंब आणि सामायिक खाते',
    'quick.safety': 'सुरक्षा आणि आणीबाणी',
    'quick.wallet': 'वॉलेट आणि देयके',

    // Home & Service Discovery (Feature 2)
    'home.greeting_morning': 'शुभ सकाळ,',
    'home.greeting_afternoon': 'शुभ दुपार,',
    'home.greeting_evening': 'शुभ संध्याकाळ,',
    'home.where_to': 'आज कुठे प्रवास करायचा आहे?',
    'home.location_loading': 'सध्याचे स्थान शोधत आहे...',
    'home.location_permission_needed': 'अचूक पिकअपसाठी GPS लोकेशन सुरू करा',
    'home.location_enable_btn': 'GPS सुरू करा',
    'home.active_ride': 'सक्रिय राइड सुरू आहे',
    'home.upcoming_booking': 'आगामी आरक्षण',
    'home.services_title': 'सेवा निवडा',
    'home.more_services': 'अधिक सेवा',
    'home.saved_shortcuts': 'जतन केलेले शॉर्टकट',
    'home.recent_destinations': 'नुकतीच भेट दिलेली ठिकाणे',
    'home.offers_title': 'खास ऑफर्स आणि सूट',
    'home.service_coming_soon_title': 'सेवा लवकरच सुरू होत आहे!',
    'home.service_coming_soon_desc': 'आम्ही लवकरच आपल्या मार्गावर ही सेवा सुरू करत आहोत!',
    'home.call_driver': 'चालकाला कॉल करा',
    'home.track_live': 'थेट GPS ट्रॅकिंग',
    'home.otp_label': 'प्रारंभ PIN / OTP',

    // Ride Booking & Categories (Feature 3)
    'ride.title': 'इंटरसिटी राइड बुक करा',
    'ride.one_way': 'एकतर्फी',
    'ride.round_trip': 'परतीचा प्रवास',
    'ride.rental': 'रेंटल',
    'ride.pickup_placeholder': 'पिकअप ठिकाण प्रविष्ट करा...',
    'ride.drop_placeholder': 'गंतव्य स्थान प्रविष्ट करा...',
    'ride.use_current_loc': 'सध्याचे स्थान वापरा',
    'ride.hatchback': 'मिनी / हॅचबॅक',
    'ride.sedan': 'आरामदायी सेडान',
    'ride.suv': 'मोठी एसयूव्ही (7-आसनी)',
    'ride.premium': 'प्रीमियम प्राइम',
    'ride.surge_active': 'उच्च मागणी वाढ',
    'ride.book_for': 'राइड कोणासाठी आहे',
    'ride.self': 'स्वतः',
    'ride.family_member': 'कुटुंब / पाहुणे',
    'ride.schedule_time': 'राइड शेड्यूल करा',
    'ride.leave_now': 'आत्ताच निघा',
    'ride.women_only': 'महिला चालक प्राधान्य',
    'ride.priority': 'प्राधान्य / आणीबाणी सेवा',
    'ride.fare_details': 'भाड्याचे सविस्तर विवरण',
    'ride.promo_code': 'प्रोमो कोड वापरा',
    'ride.book_now': 'कॅब बुक करा',
    'ride.searching_driver': 'जवळच्या चालकांशी संपर्क साधत आहे...',
    'ride.seats_label': 'आवश्यक जागा',
    'ride.distance_eta': 'अंतर आणि प्रवासाचा वेळ',

    // Schedule / Reserve (Feature 4)
    'schedule.title': 'आगामी आरक्षण शेड्यूल करा',
    'schedule.book_now': 'आत्ता बुक करा',
    'schedule.schedule_later': 'नंतरसाठी शेड्यूल करा',
    'schedule.pick_date': 'तारीख निवडा',
    'schedule.pick_time': 'वेळ निवडा',
    'schedule.today': 'आज',
    'schedule.tomorrow': 'उद्या',
    'schedule.custom_date': 'इतर तारीख निवडा',
    'schedule.min_lead_time_notice': 'अ‍ॅडव्हान्स आरक्षणासाठी किमान ४५ मिनिटे आधी बुकिंग आवश्यक आहे.',
    'schedule.max_advance_notice': 'आपण ७ दिवस आधीपर्यंत राइड शेड्यूल करू शकता.',
    'schedule.confirmed_title': 'आरक्षण निश्चित झाले! 🎉',
    'schedule.confirmed_desc': 'आपली राइड आरक्षित झाली आहे. पिकअपच्या ४५ मिनिटे आधी चालक नियुक्त केला जाईल.',
    'schedule.view_reservations': 'आगामी फेऱ्या पहा',
    'schedule.modify_reservation': 'आरक्षण बदला',
    'schedule.modify_title': 'पिकअप वेळ बदला',
    'schedule.modify_confirm': 'बदलांची पुष्टी करा',
    'schedule.fare_difference': 'भाडे समायोजन',
    'schedule.cancel_policy': 'पिकअपच्या २ तास आधीपर्यंत मोफत रद्दीकरण.',

    // Negotiation / Own Fare Model (Feature 5)
    'negotiation.title': 'स्वतःचे भाडे ठरवा (मोलभाव)',
    'negotiation.pricing_mode': 'दर ठरवण्याची पद्धत',
    'negotiation.standard_fare': 'नियमित अ‍ॅप भाडे',
    'negotiation.your_offer': 'आपली ऑफर (मोलभाव 🤝)',
    'negotiation.suggested_range': 'योग्य भाड्याचा अंदाज',
    'negotiation.send_offer': 'जवळच्या चालकांना ऑफर पाठवा',
    'negotiation.waiting_title': 'आपली ऑफर पाठवली जात आहे...',
    'negotiation.waiting_subtitle': 'जवळचे चालक आपल्या ऑफरची पाहणी करत आहेत. खाली त्यांच्या ऑफर्स पहा.',
    'negotiation.driver_offers_title': 'चालकांच्या ऑफर्स व बोल्या',
    'negotiation.accept_offer': 'स्वीकारा आणि प्रवास सुरू करा',
    'negotiation.counter_offer_badge': 'चालकाची काउंटर ऑफर',
    'negotiation.exact_match_badge': 'ऑफर स्वीकारली!',
    'negotiation.best_price_badge': '🔥 सर्वोत्तम दर',
    'negotiation.fallback_btn': 'नियमित दरावर चालक शोधा (₹{fare})',
    'negotiation.fallback_desc': 'चालक मिळाला नाही? तात्काळ नियमित दरावर बुकिंग सुरू करा.',
    'negotiation.time_remaining': 'उर्वरित वेळ',

    // Live Tracking & Matching (Feature 4)
    'track.title': 'थेट राइड ट्रॅकिंग',
    'track.driver_assigned': 'चालक नियुक्त',
    'track.driver_arrived': 'चालक पोहोचला',
    'track.in_progress': 'प्रवास सुरू आहे',
    'track.completed': 'गंतव्यस्थानी पोहोचलो',
    'track.otp_instruction': 'कॅबमध्ये बसल्यानंतरच हा पिन चालकाला सांगा',
    'track.call_driver': 'चालकाला कॉल करा',
    'track.chat_driver': 'चॅट करा',
    'track.sos_alert': 'आणीबाणी SOS',
    'track.sos_desc': 'विश्वासू संपर्कांना थेट लोकेशन पाठवा आणि 112 वर संपर्क करा',
    'track.share_trip': 'थेट प्रवास शेअर करा',
    'track.cancel_ride': 'राइड रद्द करा',
    'track.cancel_reason_title': 'रद्द करण्याचे कारण निवडा',
    'track.cancel_reason_1': 'चालक येण्यास खूप वेळ घेत आहे',
    'track.cancel_reason_2': 'चालकाने रद्द करण्यास सांगितले',
    'track.cancel_reason_3': 'प्रवासाचा बेत बदलला',
    'track.cancel_reason_4': 'चुकीचा पत्ता निवडला गेला',
    'track.cancel_reason_5': 'दुसरे वाहन मिळाले',
    'track.cancel_confirm': 'रद्द करण्याची पुष्टी करा',
    'track.radar_title': 'जवळचे चालक शोधत आहे...',
    'track.radar_subtitle': 'आपल्या राइडची विनंती जवळच्या उत्कृष्ट चालकांना पाठवली जात आहे',

    // Family
    'family.title': 'कुटुंब आणि सामायिक खाते',
    'family.group_name': 'कौटुंबिक गट',
    'family.organizer': 'कुटुंब प्रमुख',
    'family.members': 'कुटुंबातील सदस्य',
    'family.add_member': 'सदस्य जोडा',
    'family.shared_payment': 'सामायिक पेमेंट पद्धत',
    'family.shared_payment_desc': 'कुटुंबातील सदस्यांना तुमच्या वॉलेटमधून प्रवास करू द्या',
    'family.permissions': 'परवानग्या',
    'family.can_book': 'राइड बुक करू शकतात',
    'family.can_pay': 'सामायिक पेमेंट वापरू शकतात',
    'family.can_track': 'राइड ट्रॅक करू शकतात',
    'family.remove_member': 'सदस्य हटवा',
    'family.remove_confirm': 'तुम्हाला खात्री आहे का की हा सदस्य हटवायचा आहे?',

    // Safety & Emergency
    'safety.title': 'आणीबाणी आणि विश्वासू संपर्क',
    'safety.add_contact': 'आणीबाणी संपर्क जोडा',
    'safety.primary': 'मुख्य संपर्क',
    'safety.auto_share': 'थेट प्रवास ऑटो-शेअर करा',
    'safety.desc': 'प्रवासादरम्यान आणीबाणी संपर्कांना तात्काळ सूचना व थेट जीपीएस ट्रॅकिंग पाठवले जाते.',

    // Saved Addresses & Places (Feature 2)
    'address.title': 'जतन केलेली ठिकाणे व पत्ते',
    'address.add_new': 'नवीन पत्ता जोडा',
    'address.saved_routes': 'जतन केलेले मार्ग',
    'address.add_route': 'मार्ग जतन करा',
    'address.no_addresses': 'कोणतेही जतन केलेले ठिकाण नाही',
    'address.no_routes': 'कोणतेही जतन केलेले मार्ग नाहीत',
    'address.home': 'घर',
    'address.work': 'कार्यालय',
    'address.gym': 'जिम',
    'address.partner': 'जोडीदाराचे घर',
    'address.other': 'इतर',
    'address.search_placeholder': 'ठिकाण, परिसर किंवा लँडमार्क शोधा...',
    'address.confirm_location': 'ठिकाणाची पुष्टी करा',
    'address.recent_searches': 'नुकतेच शोधलेले',
    'address.clear_history': 'इतिहास साफ करा',
    'address.save_as': 'ठिकाणाचा प्रकार',
    'address.flat_building': 'घर / फ्लॅट / इमारतीचे नाव आणि लँडमार्क',
    'address.delete_confirm': 'तुम्हाला खात्री आहे का की हे जतन केलेले ठिकाण हटवायचे आहे?',
    'address.delete_route_confirm': 'तुम्हाला खात्री आहे का की हा जतन केलेला मार्ग हटवायचा आहे?',

    // Settings & Privacy
    'settings.title': 'अ‍ॅप सेटिंग्ज',
    'settings.preferences': 'प्राधान्ये',
    'settings.dark_mode': 'डार्क मोड',
    'settings.dark_mode_desc': 'उत्कृष्ट गडद थीम',
    'settings.notifications': 'सूचना',
    'settings.privacy': 'गोपनीयता आणि सुरक्षा',
    'settings.language': 'भाषा',
    'settings.sessions': 'सक्रिय उपकरणे व सेशन्स',
    'settings.about': 'अ‍ॅपबद्दल',

    // Sessions
    'sessions.title': 'सक्रिय उपकरणे व सेशन्स',
    'sessions.current': 'सध्याचे उपकरण',
    'sessions.revoke': 'सेशन समाप्त करा',
    'sessions.logout_all': 'सर्व उपकरणांमधून लॉग आउट करा',

    // Danger Zone
    'danger.title': 'धोकादायक क्षेत्र',
    'danger.logout': 'लॉग आउट',
    'danger.logout_confirm': 'तुम्हाला नक्की लॉग आउट करायचे आहे का?',
    'danger.delete_account': 'खाते हटवा',
    'danger.delete_warning': 'आपले प्रोफाईल कायमचे निष्क्रिय करा आणि सर्व सेशन्स रद्द करा.',
  },
}

let globalLanguage: LanguageCode = 'en'
const listeners = new Set<(lang: LanguageCode) => void>()

export function useTranslation() {
  const [language, setLanguageState] = useState<LanguageCode>(globalLanguage)

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'hi' || saved === 'mr') {
        globalLanguage = saved as LanguageCode
        setLanguageState(saved as LanguageCode)
      }
    })

    const listener = (lang: LanguageCode) => setLanguageState(lang)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const setLanguage = useCallback(async (newLang: LanguageCode) => {
    globalLanguage = newLang
    setLanguageState(newLang)
    listeners.forEach((l) => l(newLang))
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, newLang)
    } catch {}
  }, [])

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      const dict = translations[language] || translations.en
      return dict[key] || defaultText || key
    },
    [language]
  )

  return { t, language, setLanguage }
}
