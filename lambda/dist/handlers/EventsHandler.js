"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InputWrap_1 = __importDefault(require("../lib/InputWrap"));
const request_1 = require("../lib/request");
const Schema_1 = require("../lib/Schema");
const amazon_speech_1 = __importDefault(require("ssml-builder/amazon_speech"));
const AmazonDate_1 = __importDefault(require("../lib/AmazonDate"));
//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html
class EventsHandler {
    canHandle(input) {
        let wrap = new InputWrap_1.default(input);
        if (wrap.intent && wrap.intent.name === Schema_1.Schema.EventsIntent)
            return true;
        else
            return false;
    }
    handle(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let wrap = new InputWrap_1.default(input);
            if (wrap.intent && wrap.slots) {
                let isVenue = wrap.slots[Schema_1.Schema.VenueSlot] !== undefined;
                let place = isVenue ? wrap.slots[Schema_1.Schema.VenueSlot] : wrap.slots[Schema_1.Schema.LocationSlot];
                //if no place from venue or location, try load from default
                if (!place)
                    place = yield wrap.getPresistentArr(Schema_1.Schema.LocationSlot);
                if (place) {
                    if (place.resId) {
                        let slug = place.resId;
                        let placeName = place.resValue;
                        let req = {
                            location_slug: slug,
                            rows: 5,
                            //sort by date if venue, by popularity if location
                            order: isVenue ? request_1.EventRequestOrder.date : request_1.EventRequestOrder.popularity
                        };
                        let dateSlot = wrap.slots[Schema_1.Schema.DateSlot];
                        let date = undefined;
                        if (dateSlot) {
                            date = new AmazonDate_1.default(dateSlot.value);
                            req.start_date = date.start().toISOString();
                            req.end_date = date.end().toISOString();
                            console.log(JSON.stringify(date));
                        }
                        let events = yield request_1.getEvents(req);
                        let speech = new amazon_speech_1.default()
                            .say(events.length != 0 ?
                            "I found the following events" :
                            "I couldn't find any events");
                        speech.say((isVenue ? "at " : "in ") + placeName);
                        if (date)
                            date.toSpeech(speech);
                        speech.say(":");
                        // let speech = 
                        // `I found the following events ${isVenue ? "at " : "in " + placeName} ${date ? date.toSpeech() : ""}:`
                        events.forEach(event => speech.sentence(event.name + ""));
                        console.log("SPEECH: " + speech.ssml());
                        return input.responseBuilder
                            .speak(speech.ssml())
                            .getResponse();
                    }
                    else
                        return input.responseBuilder
                            .speak(`Sorry, I don't know anywhere called ${place.value}`)
                            // .reprompt('Try again, speaking clearly and slowly')
                            .getResponse();
                    //no location provided
                }
                else
                    return input.responseBuilder
                        .speak(`Please state a location in your question or set your home location`)
                        // .reprompt('You could set your home location to Wellington by saying "Set my location to Wellington"')
                        .getResponse();
            }
            else {
                throw new Error("VenueHandler Error: " + JSON.stringify(wrap));
            }
        });
    }
}
exports.EventsHandler = EventsHandler;
//# sourceMappingURL=EventsHandler.js.map