const fs = require('fs');
const file = 'contexts/LanguageContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove 'ar' from type Language
content = content.replace(/type Language = 'ar' \| 'fr' \| 'en';/, "type Language = 'fr' | 'en';");

// Remove 'ar: '...' ' from translations
content = content.replace(/ar:\s*['"`][^'"`]*?['"`],\s*/g, '');

// Change default language in useState
content = content.replace(/useState<Language>\('ar'\)/, "useState<Language>('en')");

// Change savedLanguage check
content = content.replace(/savedLanguage === 'ar' \|\| savedLanguage === 'fr'/, "savedLanguage === 'fr'");

// Update dir and isRTL
content = content.replace(/const dir = language === 'ar' \? 'rtl' : 'ltr';/, "const dir = 'ltr';");
content = content.replace(/const dir: Dir = language === 'ar' \? 'rtl' : 'ltr';/, "const dir: Dir = 'ltr';");
content = content.replace(/const isRTL = language === 'ar';/, "const isRTL = false;");

fs.writeFileSync(file, content);
console.log('LanguageContext updated');
