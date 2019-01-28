"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class CustomSlot {
    constructor(slot) {
        this.name = slot.name;
        this.value = slot.value;
        if (slot.resolutions &&
            slot.resolutions.resolutionsPerAuthority &&
            slot.resolutions.resolutionsPerAuthority[0].values) {
            this.resId = slot.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            this.resValue = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        }
    }
}
exports.CustomSlot = CustomSlot;
class InputWrap {
    constructor(input) {
        this.attrs = input.attributesManager;
        this.sessionAttrs = this.attrs.getSessionAttributes();
        this.persistentAttrs = this.attrs.getPersistentAttributes();
        let req = input.requestEnvelope.request;
        if (req.type === "IntentRequest") {
            this.intent = req.intent;
            if (this.intent.slots) {
                this.slots = {};
                for (let slotKey in this.intent.slots) {
                    let slot = this.intent.slots[slotKey];
                    if (slot.value)
                        this.slots[slotKey] = new CustomSlot(slot);
                }
            }
        }
    }
    getSessionAttr(key) {
        return this.sessionAttrs[key];
    }
    setSessionAttr(key, val) {
        this.sessionAttrs[key] = val;
        this.attrs.setSessionAttributes(this.sessionAttrs);
    }
    getPresistentArr(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.persistentAttrs)[key];
        });
    }
    setPersistentAttr(key, val) {
        return __awaiter(this, void 0, void 0, function* () {
            (yield this.persistentAttrs)[key] = val;
            this.attrs.setPersistentAttributes((yield this.persistentAttrs));
            yield this.attrs.savePersistentAttributes();
        });
    }
}
exports.default = InputWrap;
//# sourceMappingURL=InputWrap.js.map