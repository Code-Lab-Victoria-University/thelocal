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
const InputWrap_1 = require("../lib/InputWrap");
const request_1 = require("../lib/request");
const slotName = "Location";
const intentName = "SetLocationIntent";
let locations;
(() => __awaiter(this, void 0, void 0, function* () {
    locations = yield request_1.getLocations();
}))();
class SetLocationHandler {
    canHandle(input) {
        let wrap = new InputWrap_1.default(input);
        if (wrap.intent) {
            if (wrap.intent.name === intentName)
                return true;
            else if (["YesIntent", "NoIntent"].includes(wrap.intent.name) && wrap.getSessionAttr(slotName))
                return true;
        }
        return false;
    }
    handle(input) {
        let wrap = new InputWrap_1.default(input);
        if (!wrap.intent)
            return input.responseBuilder.speak("ERROR: SetLocationHandler No Intent").getResponse();
        if (wrap.intent.name === intentName && wrap.slots) {
            let locationSlot = wrap.slots[slotName];
            let location = locations.find(loc => loc.url_slug == locationSlot.id)
                || locations.find(loc => loc.name.includes(locationSlot.spoken.toLowerCase()));
            if (location) {
                wrap.setSessionAttr(slotName, location);
                let speech = `Do you want to set your location to ${location.name}`;
                return input.responseBuilder
                    .speak(speech)
                    .reprompt(speech + ". You can answer Yes or No.")
                    .getResponse();
            }
            else {
                return input.responseBuilder
                    .speak(`No such location as ${locationSlot.value}`)
                    .getResponse();
            }
        }
        else {
            let location = wrap.getSessionAttr(slotName);
            let speech;
            if (wrap.intent.name === "YesIntent") {
                wrap.setPersistentAttr(slotName, location);
                speech = `Your location is set to ${location.name}`;
            }
            else
                speech = `Not setting your location`;
            return input.responseBuilder
                .speak(speech)
                .getResponse();
        }
    }
}
exports.SetLocationHandler = SetLocationHandler;
//# sourceMappingURL=SetLocationHandler.js.map