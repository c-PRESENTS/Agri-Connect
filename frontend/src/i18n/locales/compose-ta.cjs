const fs = require('fs');

// Read references
const en = JSON.parse(fs.readFileSync('C:/Agri-Connect/frontend/src/i18n/locales/en.json', 'utf8'));
const orig = JSON.parse(fs.readFileSync('C:/Users/Rohan/AppData/Local/Temp/opencode/ta_original.json', 'utf8'));

// Start with original translations
const result = JSON.parse(JSON.stringify(orig)); // deep copy

// Check for missing sections
const enSections = Object.keys(en);
let missingSections = enSections.filter(s => !result[s]);
let existingSections = enSections.filter(s => result[s]);

console.log('Existing sections (from original): ' + existingSections.length);
console.log('Missing sections: ' + missingSections.length);
console.log('Missing: ' + missingSections.join(', '));

// Count missing keys within existing sections
let totalMissingKeys = 0;
existingSections.forEach(s => {
    Object.keys(en[s]).forEach(k => {
        if (!result[s][k]) totalMissingKeys++;
    });
});
console.log('Missing keys within existing sections: ' + totalMissingKeys);

// Write result (currently just the original)
fs.writeFileSync('C:/Agri-Connect/frontend/src/i18n/locales/ta.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Written base file. Sections: ' + Object.keys(result).length);
