"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function baseEqual(a, b) {
    return a.localeCompare(b, 'en', {
        sensitivity: "base"
    }) === 0;
}
exports.baseEqual = baseEqual;
//# sourceMappingURL=Util.js.map