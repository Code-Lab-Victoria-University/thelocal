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
const request = require("request-promise-native");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const alexa_app_1 = require("alexa-app");
function eventFindaRequest(endpoint, query) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`;
        let response = yield request.get(url, {
            auth: {
                user: "alexaevents",
                pass: "3pjmvv59cgqc"
            },
            qs: query
        });
        return JSON.parse(response);
    });
}
function flattenLocation(node, list) {
    if (!list)
        //exclude New Zealand from list
        list = [];
    //exclude numbered zones
    else if (!/\d/.test(node.name))
        list.push(node);
    //add node children
    if (node.children)
        node.children.children.forEach(child => {
            flattenLocation(child, list);
        });
    return list;
}
function getLocationNames() {
    return __awaiter(this, void 0, void 0, function* () {
        return flattenLocation((yield eventFindaRequest('locations', {
            fields: "location:(id,name,url_slug,count_current_events,children)",
            id: 574,
            levels: 3,
            venue: false
        })).locations[0]);
    });
}
(() => __awaiter(this, void 0, void 0, function* () {
    let app = new alexa_app_1.app();
    let locations = yield getLocationNames();
    let dictionary = {
        "homeName": ["location", "home", "house", "residence"]
    };
    let slots = {
        Place: locations.map(node => node.name)
    };
    app.customSlot("Place", locations.map(node => { return { id: node.url_slug, value: node.name }; }));
    app.intent("setLocationIntent", {
        slots: { "Location": "LocationType" },
        utterances: [
            "{|I live|I am|I'm|My homeName is} in {-|Location}",
            "Set My {homeName} to {-|Location}"
        ]
    });
    yield util_1.promisify(fs_1.writeFile)(path_1.join("models", "eu-AU.json"), app.schemas.askcli());
}))();
//# sourceMappingURL=index.js.map