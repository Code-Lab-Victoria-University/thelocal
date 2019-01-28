"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InputWrap_1 = __importDefault(require("../lib/InputWrap"));
const Schema_1 = require("../lib/Schema");
class SetLocationHandler {
    canHandle(input) {
        let wrap = new InputWrap_1.default(input);
        if (wrap.intent) {
            if (wrap.intent.name === Schema_1.Schema.SetLocationIntent)
                return true;
            else if (["YesIntent", "NoIntent"].includes(wrap.intent.name) && wrap.getSessionAttr(Schema_1.Schema.LocationSlot))
                return true;
        }
        return false;
    }
    handle(input) {
        let wrap = new InputWrap_1.default(input);
        if (!wrap.intent)
            return input.responseBuilder.speak("ERROR: SetLocationHandler No Intent").getResponse();
        if (wrap.intent.name === Schema_1.Schema.SetLocationIntent) {
            let locationSlot = wrap.slots && wrap.slots[Schema_1.Schema.LocationSlot];
            if (locationSlot) {
                if (locationSlot.value) {
                    wrap.setSessionAttr(Schema_1.Schema.LocationSlot, locationSlot);
                    let speech = `Do you want to set your location to ${locationSlot.value}`;
                    return input.responseBuilder
                        .speak(speech)
                        .reprompt(speech + ", Yes or No")
                        .getResponse();
                }
                else
                    return input.responseBuilder
                        .speak(`No such location as ${locationSlot.value}`)
                        .getResponse();
            }
            else
                return input.responseBuilder
                    .speak("You tried to set your location but I didn't understand. Make sure to say your location slowly and clearly")
                    .getResponse();
        }
        else {
            //assuming value in session attrs, as only other way for handler to return
            let location = wrap.getSessionAttr(Schema_1.Schema.LocationSlot);
            let speech;
            if (wrap.intent.name === "YesIntent") {
                wrap.setPersistentAttr(Schema_1.Schema.LocationSlot, location);
                speech = `Your location is set to ${location.value}`;
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