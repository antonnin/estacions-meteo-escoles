const fs = require("fs");
const file = "js/config.js";
const raw = fs.readFileSync(file, "utf8");
let content = raw.replace(/\r\n/g, "\n");

// Test exact match with what we found in the file
const idxPols = content.indexOf("'Pols'");
const idxVent = content.indexOf("'wind' },\n            },", idxPols);
const oldBlock = content.substring(idxPols - 50, idxVent + 24);
console.log("Old block sample:", JSON.stringify(oldBlock.substring(0,80)));
console.log("Old block length:", oldBlock.length);

const newFieldsBlock = "fields: {\n                field1: { name: 'Temperatura', unit: '\u00b0C', icon: '\u{1F321}\uFE0F', color: '#FF6B6B', type: 'temperature' },\n                field2: { name: 'Humitat', unit: '%', icon: '\u{1F4A7}', color: '#54a0ff', type: 'humidity' },\n                field3: { name: 'Lluminositat', unit: '%', icon: '\u2600\uFE0F', color: '#f1c40f', type: 'light' },\n                field4: { name: 'Pressi\u00f3', unit: 'hPa', icon: '\u{1F4CA}', color: '#1dd1a1', type: 'pressure' },\n                field5: { name: 'Vent', unit: 'km/h', icon: '\u{1F4A8}', color: '#a29bfe', type: 'wind' },\n            },";

// Find all occurrences and replace
let result = content;
let replaceCount = 0;
const markerStr = "active:"; // field blocks always precede active:

// Strategy: replace from 'fields: {\n                field1: { name: \'Pols\'' to 'wind\' },\n            },'
const startMarker = "fields: {\n                field1: { name: 'Pols'";
const endMarker = "'wind' },\n            },";

let searchFrom = 0;
while (true) {
    const start = result.indexOf(startMarker, searchFrom);
    if (start === -1) break;
    const end = result.indexOf(endMarker, start);
    if (end === -1) break;
    const fullEnd = end + endMarker.length;
    result = result.substring(0, start) + newFieldsBlock + result.substring(fullEnd);
    replaceCount++;
    searchFrom = start + newFieldsBlock.length;
}

console.log("Replaced:", replaceCount, "blocks");
result = result.replace(/\n/g, "\r\n");
fs.writeFileSync(file, result, "utf8");

// Verify
const v = fs.readFileSync(file, "utf8");
console.log("Remaining Pols:", (v.match(/field1: \{ name: .Pols./g) || []).length);
console.log("New Temperatura:", (v.match(/field1: \{ name: .Temperatura./g) || []).length);
