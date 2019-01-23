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
function eventFindaRequest(endpoint, query) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`;
        let response = request.get(url, {
            auth: {
                user: "alexaevents",
                pass: "3pjmvv59cgqc"
            },
            qs: query
        });
        // console.log(endpoint + ": " + JSON.stringify(query))
        return JSON.parse(yield response);
    });
}
exports.eventFindaRequest = eventFindaRequest;
const rows = 20;
function eventFindaRequestMultiple(endpoint, query, maxRows) {
    return __awaiter(this, void 0, void 0, function* () {
        let row = 0;
        let returns = [];
        query = query || {};
        query.rows = rows;
        let isMore = true;
        while (isMore && (!maxRows || row < maxRows)) {
            let cur = (yield eventFindaRequest(endpoint, Object.assign(query, { offset: row })))[endpoint];
            if (0 < cur.length) {
                returns.push(...cur);
            }
            else
                isMore = false;
            row += rows;
        }
        return returns;
    });
}
exports.eventFindaRequestMultiple = eventFindaRequestMultiple;
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
    delete node.children;
    node.name = node.name.toLowerCase();
    return list;
}
function getLocations(levels) {
    return __awaiter(this, void 0, void 0, function* () {
        return flattenLocation((yield eventFindaRequest('locations', {
            fields: "location:(id,name,url_slug,count_current_events,children)",
            levels: levels || 4,
            venue: false
        })).locations[0]);
    });
}
exports.getLocations = getLocations;
function getVenues(url_slug) {
    return __awaiter(this, void 0, void 0, function* () {
        let row = 0;
        let venues = yield eventFindaRequestMultiple('locations', {
            venue: true,
            rows: rows,
            offset: row,
            order: "popularity",
            fields: "location:(id,name,url_slug,count_current_events,description)",
            location_slug: url_slug
        }, 40);
        return venues;
    });
}
exports.getVenues = getVenues;
//# sourceMappingURL=request.js.map