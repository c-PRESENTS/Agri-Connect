const fs = require('fs');

const en = JSON.parse(fs.readFileSync('C:/Agri-Connect/client/src/i18n/locales/en.json', 'utf8'));
const sectionNames = new Set(Object.keys(en));

const taRaw = fs.readFileSync('C:/Agri-Connect/client/src/i18n/locales/ta.json', 'utf8');

function extractJSON(s, start) {
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
        let ch = s[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (!inStr) {
            if (ch === '{' || ch === '[') depth++;
            else if (ch === '}' || ch === ']') { depth--; if (depth === 0) return s.substring(start, i + 1); }
        }
    }
    return null;
}

let result = {};
let i = 0;
let count = 0;
let notFoundSection = null;

// Regex to match any key within the broken concatenated content
// We need to skip whitespace and commas at the top level
function skipWS(s, pos) {
    while (pos < s.length && (s[pos] === ' ' || s[pos] === '\t' || s[pos] === '\n' || s[pos] === '\r' || s[pos] === ',')) pos++;
    return pos;
}

i = skipWS(taRaw, i);

while (i < taRaw.length) {
    // Try to match a key-value pattern at current position
    let rest = taRaw.substring(i);
    let m = rest.match(/^"([a-zA-Z_]+)"\s*:\s*(\{|\[)/);
    if (m) {
        let sectionName = m[1];
        // Only extract if it's a known section or not_found
        if (sectionNames.has(sectionName) || sectionName === 'not_found') {
            let valueStart = i + m[0].indexOf(m[2]); // position of { or [
            let value = extractJSON(taRaw, valueStart);
            if (value) {
                try {
                    let parsed = JSON.parse(value);
                    if (sectionNames.has(sectionName)) {
                        result[sectionName] = parsed;
                        count++;
                    } else if (sectionName === 'not_found') {
                        notFoundSection = parsed;
                    }
                    i = valueStart + value.length;
                    i = skipWS(taRaw, i);
                    continue;
                } catch(e) {
                    console.log('Parse error on ' + sectionName + ': ' + e.message.substring(0, 60));
                }
            }
        }
    }
    i++;
}

console.log('Extracted ' + count + ' known sections');

const enKeys = Object.keys(en);
const resultKeys = Object.keys(result);
const missing = enKeys.filter(k => !resultKeys.includes(k));
console.log('Complete sections: ' + resultKeys.length + '/' + enKeys.length);
if (missing.length > 0) console.log('MISSING sections: ' + missing.join(', '));

if (notFoundSection) result.not_found = notFoundSection;

fs.writeFileSync('C:/Agri-Connect/client/src/i18n/locales/ta.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Written. Size: ' + fs.statSync('C:/Agri-Connect/client/src/i18n/locales/ta.json').size + ' bytes');

// Validate
try {
    const v = JSON.parse(fs.readFileSync('C:/Agri-Connect/client/src/i18n/locales/ta.json', 'utf8'));
    const vk = Object.keys(v);
    const enk = Object.keys(en);
    const miss = enk.filter(k => !vk.includes(k));
    if (miss.length === 0) console.log('VALIDATION PASSED - all sections present');
    else console.log('VALIDATION WARNING - missing: ' + miss.join(', '));
    if (v.not_found) console.log('not_found preserved');
    // Check key completeness
    let missingKeys = 0;
    enk.forEach(sec => {
        if (v[sec]) {
            Object.keys(en[sec]).forEach(k => {
                if (!v[sec][k]) missingKeys++;
            });
        }
    });
    if (missingKeys > 0) console.log('Missing keys within sections: ' + missingKeys);
    else console.log('All keys present in all sections');
} catch(e) {
    console.log('VALIDATION FAILED: ' + e.message);
}
