import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'mr' | 'bn' | 'gu';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'Dashboard': 'Dashboard',
    'Appointment Management': 'Appointment Management',
    'Prescription Management': 'Prescription Management',
    'Patient Management': 'Patient Management',
    'Revenue & Settlement': 'Revenue & Settlement',
    'Availability Management': 'Availability Management',
    'Reviews & Ratings': 'Reviews & Ratings',
    'Notifications': 'Notifications',
    'Help & Support': 'Help & Support',
    'Transactions': 'Transactions',
    'Settings': 'Settings',
    'Sign Out': 'Sign Out',
    'Welcome Back': 'Welcome Back',
    'Search patients, appointments, prescriptions...': 'Search patients, appointments, prescriptions...',
    'Total Appointments': 'Total Appointments',
    'Total Revenue': 'Total Revenue',
    'Active Patients': 'Active Patients',
    'Average Rating': 'Average Rating',
    'Quick Actions': 'Quick Actions',
    'Consultation Type': 'Consultation Type',
    'Available Days': 'Available Days',
    'Duration': 'Duration',
    'Date Range': 'Date Range',
    'Status': 'Status',
    'Actions': 'Actions',
    'Language Preferences': 'Language Preferences',
    'Select Language': 'Select Language',
    'Save Changes': 'Save Changes'
  },
  hi: {
    'Dashboard': 'डैशबोर्ड',
    'Appointment Management': 'नियुक्ति प्रबंधन',
    'Prescription Management': 'नुस्खा प्रबंधन',
    'Patient Management': 'मरीज प्रबंधन',
    'Revenue & Settlement': 'राजस्व और निपटान',
    'Availability Management': 'उपलब्धता प्रबंधन',
    'Reviews & Ratings': 'समीक्षा और रेटिंग',
    'Notifications': 'सूचनाएं',
    'Help & Support': 'सहायता और समर्थन',
    'Transactions': 'लेन-देन',
    'Settings': 'सेटिंग्स',
    'Sign Out': 'साइन आउट',
    'Welcome Back': 'वापसी पर स्वागत है',
    'Search patients, appointments, prescriptions...': 'मरीजों, नियुक्तियों, नुस्खों की खोज करें...',
    'Total Appointments': 'कुल नियुक्तियां',
    'Total Revenue': 'कुल राजस्व',
    'Active Patients': 'सक्रिय मरीज',
    'Average Rating': 'औसत रेटिंग',
    'Quick Actions': 'त्वरित कार्रवाई',
    'Consultation Type': 'परामर्श का प्रकार',
    'Available Days': 'उपलब्ध दिन',
    'Duration': 'अवधि',
    'Date Range': 'तारीख सीमा',
    'Status': 'स्थिति',
    'Actions': 'कार्रवाई',
    'Language Preferences': 'भाषा प्राथमिकताएं',
    'Select Language': 'भाषा चुनें',
    'Save Changes': 'परिवर्तन सहेजें'
  },
  te: {
    'Dashboard': 'డాష్‌బోర్డ్',
    'Appointment Management': 'నియామకాల నిర్వహణ',
    'Prescription Management': 'ప్రిస్క్రిప్షన్ నిర్వహణ',
    'Patient Management': 'రోగుల నిర్వహణ',
    'Revenue & Settlement': 'ఆదాయం & సెటిల్మెంట్',
    'Availability Management': 'లభ్యత నిర్వహణ',
    'Reviews & Ratings': 'సమీక్షలు & రేటింగ్‌లు',
    'Notifications': 'నోటిఫికேషన్లు',
    'Help & Support': 'సహాయం & మద్దతు',
    'Settings': 'సెట్టింగులు',
    'Sign Out': 'లాగ్ అవుట్',
    'Welcome Back': 'తిరిగి స్వాగతం',
    'Search patients, appointments, prescriptions...': 'రోగులు, నియామకాలు, ప్రిస్క్రిప్షన్ల కోసం వెతకండి...',
    'Total Appointments': 'మొత్తం నియామకాలు',
    'Total Revenue': 'మొత్తం ఆదాయం',
    'Active Patients': 'క్రియాశీల రోగులు',
    'Average Rating': 'సగటు రేటింగ్',
    'Quick Actions': 'త్వరిత చర్యలు',
    'Consultation Type': 'సంప్రదింపు రకం',
    'Available Days': 'అందుబాటులో ఉన్న రోజులు',
    'Duration': 'వ్యవధి',
    'Date Range': 'తేదీ పరిధి',
    'Status': 'స్థితి',
    'Actions': 'చర్యలు',
    'Language Preferences': 'భాషా ప్రాధాన్యతలు',
    'Select Language': 'భాషను ఎంచుకోండి',
    'Save Changes': 'మార్పులను సేవ్ చేయి'
  },
  ta: {
    'Dashboard': 'டாஷ்போர்டு',
    'Appointment Management': 'சந்திப்பு மேலாண்மை',
    'Prescription Management': 'மருந்துச்சீட்டு மேலாண்மை',
    'Patient Management': 'நோயாளி மேலாண்மை',
    'Revenue & Settlement': 'வருவாய் மற்றும் தீர்வு',
    'Availability Management': 'கிடைக்கும்தன்மை மேலாண்மை',
    'Reviews & Ratings': 'மதிப்புரைகள் & மதிப்பீடுகள்',
    'Notifications': 'அறிவிப்புகள்',
    'Help & Support': 'உதவி & ஆதரவு',
    'Settings': 'அமைப்புகள்',
    'Sign Out': 'வெளியேறு',
    'Welcome Back': 'மீண்டும் வருக',
    'Search patients, appointments, prescriptions...': 'நோயாளிகள், சந்திப்புகள், மருந்துச்சீட்டுகளைத் தேடுங்கள்...',
    'Total Appointments': 'மொத்த சந்திப்புகள்',
    'Total Revenue': 'மொத்த வருவாய்',
    'Active Patients': 'செயலில் உள்ள நோயாளிகள்',
    'Average Rating': 'சராசரி மதிப்பீடு',
    'Quick Actions': 'விரைவான செயல்கள்',
    'Consultation Type': 'ஆலோசனை வகை',
    'Available Days': 'கிடைக்கும் நாட்கள்',
    'Duration': 'கால அளவு',
    'Date Range': 'தேதி வரம்பு',
    'Status': 'நிலை',
    'Actions': 'செயல்பாடுகள்',
    'Language Preferences': 'மொழி விருப்பங்கள்',
    'Select Language': 'மொழியைத் தேர்ந்தெடு',
    'Save Changes': 'மாற்றங்களை சேமிக்கவும்'
  },
  kn: {
    'Dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Appointment Management': 'ನೇಮಕಾತಿ ನಿರ್ವಹಣೆ',
    'Prescription Management': 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ನಿರ್ವಹಣೆ',
    'Patient Management': 'ರೋಗಿಗಳ ನಿರ್ವಹಣೆ',
    'Revenue & Settlement': 'ಆದಾಯ ಮತ್ತು ಇತ್ಯರ್ಥ',
    'Availability Management': 'ಲಭ್ಯತೆ ನಿರ್ವಹಣೆ',
    'Reviews & Ratings': 'ವಿಮರ್ಶೆಗಳು ಮತ್ತು ರೇಟಿಂಗ್‌ಗಳು',
    'Notifications': 'ಅಧಿಸೂಚನೆಗಳು',
    'Help & Support': 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
    'Settings': 'ಸಹಾಯಗಳು',
    'Sign Out': 'ಸೈನ್ ಔಟ್'
  } as Record<string, string>,
  mr: {
    'Dashboard': 'डॅशबोर्ड',
    'Appointment Management': 'अपॉइंटमेंट व्यवस्थापन',
    'Prescription Management': 'प्रिस्क्रिप्शन व्यवस्थापन',
    'Patient Management': 'रुग्ण व्यवस्थापन',
    'Revenue & Settlement': 'महसूल आणि सेटलमेंट',
    'Availability Management': 'उपलब्धता व्यवस्थापन',
    'Reviews & Ratings': 'पुनरावलोकने आणि रेटिंग',
    'Notifications': 'अधिसूचना',
    'Help & Support': 'मदत आणि समर्थन',
    'Settings': 'सेटिंग्ज',
    'Sign Out': 'साइन आउट'
  } as Record<string, string>,
  bn: {
    'Dashboard': 'ড্যাশবোর্ড',
    'Appointment Management': 'অ্যাপয়েন্টমেন্ট ম্যানেজমেন্ট',
    'Prescription Management': 'প্রেসক্রিপশন ম্যানেজমেন্ট',
    'Patient Management': 'রোগী ম্যানেজমেন্ট',
    'Revenue & Settlement': 'রাজস্ব ও নিষ্পত্তি',
    'Availability Management': 'উপলব্ধতা ম্যানেজমেন্ট',
    'Reviews & Ratings': 'পর্যালোচনা ও রেটিং',
    'Notifications': 'বিজ্ঞপ্তি',
    'Help & Support': 'সাহায্য ও সহযোগিতা',
    'Settings': 'সেটিংস',
    'Sign Out': 'লগ আউট'
  } as Record<string, string>,
  gu: {
    'Dashboard': 'ડેશબોર્ડ',
    'Appointment Management': 'એપોઇન્ટમેન્ટ મેનેજમેન્ટ',
    'Prescription Management': 'પ્રિસ્ક્રિપ્શન મેનેજમેન્ટ',
    'Patient Management': 'દર્દી મેનેજમેન્ટ',
    'Revenue & Settlement': 'મહેસૂલ અને પતાવટ',
    'Availability Management': 'ઉપલબ્ધતા મેનેજમેન્ટ',
    'Reviews & Ratings': 'સમીક્ષાઓ અને રેટિંગ્સ',
    'Notifications': 'સૂચનાઓ',
    'Help & Support': 'મદદ અને સપોર્ટ',
    'Settings': 'સેટિંગ્સ',
    'Sign Out': 'સાઇન આઉટ'
  } as Record<string, string>
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('vizito_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vizito_language', lang);
  };

  const t = (key: string): string => {
    const langTrans = translations[language];
    if (langTrans && langTrans[key]) {
      return langTrans[key];
    }
    // Fallback to English dictionary
    const enTrans = translations['en'];
    if (enTrans && enTrans[key]) {
      return enTrans[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
