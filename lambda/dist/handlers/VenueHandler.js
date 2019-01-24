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
// let intents = new Intents()
// intents.VenueIntent.slots["Venue"]
let venueSlot = "Venue";
let venueIntent = "VenueIntent";
class VenueHandler {
    canHandle(input) {
        let wrap = new InputWrap_1.default(input);
        if (wrap.intent && wrap.intent.name === venueIntent)
            return true;
        else
            return false;
    }
    handle(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let wrap = new InputWrap_1.default(input);
            if (wrap.intent && wrap.slots) {
                let slug = wrap.slots[venueSlot].id;
                let events = yield request_1.getEvents({
                    location_slug: "valhalla-wellington"
                });
                let speech = "I found the following events: ";
                events.forEach(event => {
                    speech += event.name + ". ";
                });
                return input.responseBuilder
                    .speak(speech)
                    .getResponse();
            }
            else
                return input.responseBuilder.getResponse();
        });
    }
}
exports.VenueHandler = VenueHandler;
//# sourceMappingURL=VenueHandler.js.map