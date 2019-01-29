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
function padN(num, nChars) {
    let str = num.toString();
    while (str.length < nChars)
        str = "0" + str;
    return str;
}
exports.padN = padN;
function mmDD(date) {
    return padN(date.getMonth() + 1, 2) + padN(date.getDate(), 2);
}
exports.mmDD = mmDD;
function yyMMDD(date) {
    return date.getFullYear() + mmDD(date);
}
exports.yyMMDD = yyMMDD;
//# sourceMappingURL=Util.js.map