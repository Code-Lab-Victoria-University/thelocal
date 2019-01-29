"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = __importStar(require("request-promise-native"));
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
        let ret = JSON.parse(yield response)[endpoint];
        console.log("COMPLETED REQUEST " + endpoint + ":\n" + response.uri.href);
        // console.log(JSON.stringify(ret))
        return ret;
    });
}
exports.eventFindaRequest = eventFindaRequest;
const rows = 20;
function eventFindaRequestMultiple(endpoint, pages, query) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = 0;
        let returns = [];
        query = query || {};
        query.rows = query.rows || rows;
        let isMore = true;
        while (isMore && (!pages || page < pages)) {
            query.offset = page * query.rows;
            let cur = (yield eventFindaRequest(endpoint, query));
            if (0 < cur.length) {
                returns.push(...cur);
            }
            else
                isMore = false;
            page++;
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
            fields: "location:(id,name,summary,url_slug,count_current_events,children)",
            levels: levels || 4,
            venue: false
        }))[0]);
    });
}
exports.getLocations = getLocations;
let venueFields = "location:(id,name,summary,url_slug,count_current_events,description)";
function getVenues(url_slug) {
    return __awaiter(this, void 0, void 0, function* () {
        let venues = yield eventFindaRequestMultiple('locations', 2, {
            venue: true,
            order: "popularity",
            fields: venueFields,
            location_slug: url_slug
        });
        return venues;
    });
}
exports.getVenues = getVenues;
var EventRequestOrder;
(function (EventRequestOrder) {
    EventRequestOrder["popularity"] = "popularity";
    EventRequestOrder["date"] = "date";
})(EventRequestOrder = exports.EventRequestOrder || (exports.EventRequestOrder = {}));
function getEvents(req) {
    return __awaiter(this, void 0, void 0, function* () {
        let events = yield eventFindaRequest('events', Object.assign({
            order: EventRequestOrder.popularity,
            fields: "event:(id,name,url_slug,description,datetime_end,datetime_start,datetime_summary,location)," + venueFields,
            rows: 10
        }, req));
        return events;
    });
}
exports.getEvents = getEvents;
//# sourceMappingURL=request.js.map