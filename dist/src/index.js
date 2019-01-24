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
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const alexa_app_1 = require("alexa-app");
const request_1 = require("../lambda/src/lib/request");
const Util_1 = require("../lambda/src/lib/Util");
function permutations(string) {
    let strings = string.split(" ");
    let arr = [];
    for (let start = 0; start < strings.length; start++) {
        for (let end = strings.length; start + 1 < end; end--) {
            if (end - start < strings.length)
                arr.push(strings.slice(start, end).join(" "));
        }
    }
    return arr;
}
let locationTypeName = "LocationType";
class Intents {
    constructor() {
        this.VenueIntent = {
            slots: { "Venue": "VenueType" },
            utterances: [
                "{|Let me know |Tell me }{Is there anything on|Is there something happening|What's|What is|What's on|What can I go to|What is happening|What's happening} {in|at} {-|Venue}"
            ]
        };
        this.SetLocationIntent = {
            slots: { Location: "LocationType" },
            utterances: [
                "{|I live |I am |I'm |I'm located }in {-|Location}",
                "{|My }{homeName} {|is in |is |is at }{-|Location}",
                "Set {|my }{homeName} {|to |as }{-|Location}"
            ]
        };
        this.YesIntent = {
            utterances: [
                "{Yes|Yep|Correct} {|thanks}",
            ]
        };
        this.NoIntent = {
            utterances: [
                "{No|Nope|Incorrect|False} {|thanks}",
            ]
        };
    }
}
exports.Intents = Intents;
(() => __awaiter(this, void 0, void 0, function* () {
    let app = new alexa_app_1.app();
    let intents = new Intents();
    Object.keys(intents).forEach(intentName => {
        app.intent(intentName, intents[intentName]);
    });
    app.dictionary = {
        "homeName": ["location", "home", "house", "residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"]
    };
    app.invocationName = "the local";
    let locations = yield request_1.getLocations();
    console.log(`${locations.length} locations retrieved`);
    app.customSlot(locationTypeName, locations.map(node => { return { id: node.url_slug, value: node.name }; }));
    let venueTypeName = "VenueType";
    let venues = [];
    let topLocations = (yield request_1.getLocations(2)).filter(loc => loc.count_current_events != 0);
    console.log(topLocations.length + " locations being used to find venues");
    for (let location of topLocations) {
        console.log(location.name);
        for (let checkVenue of yield request_1.getVenues(location.url_slug)) {
            if (!venues.some(goodVenue => Util_1.baseEqual(goodVenue.url_slug, checkVenue.url_slug) || Util_1.baseEqual(goodVenue.name, checkVenue.name)))
                venues.push(checkVenue);
        }
    }
    console.log(venues.length + " venues retrieved");
    app.customSlot(venueTypeName, venues.map(node => {
        return {
            id: node.url_slug,
            value: node.name,
            synonyms: permutations(node.name).concat(node.summary)
        };
    }));
    yield util_1.promisify(fs_1.writeFile)(path_1.join("models", "en-AU.json"), app.schemas.askcli());
}))();
//# sourceMappingURL=index.js.map