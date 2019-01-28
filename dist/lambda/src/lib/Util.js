"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function baseEqual(a, b) {
    return a.localeCompare(b, 'en', {
        sensitivity: "base"
    }) === 0;
}
exports.baseEqual = baseEqual;
function escape(text) {
    return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
exports.escape = escape;
;
//# sourceMappingURL=Util.js.map