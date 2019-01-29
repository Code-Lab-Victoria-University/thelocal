"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const iso_week_1 = __importDefault(require("iso-week"));
const Util_1 = require("./Util");
var Season;
(function (Season) {
    Season["WINTER"] = "WI";
    Season["SUMMER"] = "SU";
    Season["SPRING"] = "SP";
    Season["FALL"] = "FA";
})(Season = exports.Season || (exports.Season = {}));
class AmazonDate {
    constructor(parse) {
        let elements = parse.split("-");
        //error if year contains no-digit (not supporting decade format)
        if (elements[0].match(/\D/))
            throw new Error("Year contained non-digit while parsing: " + parse);
        else
            this.year = Number.parseInt(elements[0]);
        //no more elements
        if (elements[1] === undefined)
            return;
        // W51 week element format
        if (elements[1].match(/^W\d+$/)) {
            this.week = Number.parseInt(elements[1].slice(1));
            this.weekend = elements[2] == "WE";
            //month element
        }
        else if (elements[1].match(/^\d+$/)) {
            //zero indexed
            this.month = Number.parseInt(elements[1]) - 1;
            if (elements[2] !== undefined && elements[2].match(/^\d+$/))
                this.day = Number.parseInt(elements[2]);
            //season element
        }
        else if (elements[1].match(/^\D+$/))
            this.season = elements[1];
    }
    /** Start for api requests */
    start() {
        if (this.week !== undefined) {
            //month is 0-indexed, day isn't.
            let firstDay = new Date(this.year, 0, 1);
            //first day of year => days to first monday from 1st: Sunday = +1, Monday = +0, Tuesday = -1
            let firstMonday = 1 - firstDay.getDay();
            //TODO: consider friday part of the weekend?
            let weekendMod = this.weekend ? 5 : 0;
            //first day needs a 1 in the day as it isn't 0-this.start()indexed
            return new Date(this.year, 0, 1 + firstMonday + this.week * 7 + weekendMod);
        }
        else if (this.month !== undefined) {
            //TODO: should it be now or be the whole month including past days?
            //if no specific date and is current month, then start searching from now?
            if (this.day !== undefined && new Date().getMonth() == this.month)
                return new Date();
            //else take start of month or day if exists
            return new Date(this.year, this.month, this.day);
            //TODO: handle season
        }
        else
            return new Date(this.year);
    }
    /** End for api requests */
    end() {
        if (this.week !== undefined) {
            //end of week/end
            let monday = this.start();
            monday.setDate(monday.getDate() + (this.weekend ? 2 : 7));
            monday.setMilliseconds(-1);
            return monday;
        }
        else if (this.month !== undefined) {
            if (this.day !== undefined) {
                //end of day
                let startDay = new Date(this.year, this.month, this.day + 1);
                startDay.setMilliseconds(-1);
                return startDay;
            }
            //end of current month, even if start is part way through
            let first = new Date(this.year, this.month + 1);
            first.setMilliseconds(-1);
            return first;
        }
        else {
            //end of year
            let endYear = new Date(this.year + 1, 0, 1);
            endYear.setMilliseconds(-1);
            return endYear;
        }
    }
    toSpeech(speech) {
        speech = speech || new AmazonSpeech();
        let start = this.start();
        let thisYear = new Date().getFullYear() == this.year;
        if (this.week !== undefined) {
            let weeksToGo = this.week - iso_week_1.default();
            let prefix = this.weekend ? "weekend" : "week";
            if (weeksToGo == 1)
                return speech.say("Next " + prefix);
            else if (weeksToGo == 0)
                return speech.say("This " + prefix);
            else if (weeksToGo == -1)
                return speech.say("Last " + prefix);
            return speech.say("the").say(prefix).say("starting on").sayAs({
                word: thisYear ? "????" + Util_1.mmDD(start) : Util_1.yyMMDD(start),
                interpret: "date"
            });
            // let date = thisYear ?
            //     `on <say-as interpret-as="date">????${mmDD(start)}</say-as>` :
            //     `on <say-as interpret-as="date">${yyMMDD(start)}</say-as>`
            // return `The ${prefix} starting on ${date}`
        }
        else if (this.month !== undefined) {
            let monthsToGo = this.month - new Date().getMonth();
            if (monthsToGo == 1)
                return speech.say("next month");
            else if (monthsToGo == 0) {
                //TODO: handle next tuesday etc
                if (this.day !== undefined) {
                    let dayDiff = this.day - new Date().getDate();
                    if (dayDiff == 1)
                        return speech.say("tomorrow");
                    else if (dayDiff == 0)
                        return speech.say("today");
                    else if (dayDiff == -1)
                        return speech.say("yesterday");
                }
                else
                    return speech.say("this month");
            }
            else if (monthsToGo == -1)
                return speech.say("last month");
            let dayStr = this.day !== undefined ? Util_1.padN(start.getDate(), 2) : "??";
            let monthStr = Util_1.padN(start.getMonth() + 1, 2);
            let yearStr = thisYear ? "??" : start.getFullYear().toString();
            return speech.say("on").sayAs({
                word: yearStr + monthStr + dayStr,
                interpret: "date"
            });
        }
        let yearDiff = this.year - new Date().getFullYear();
        if (yearDiff == 1)
            return speech.say("next year");
        else if (yearDiff == 0)
            return speech.say("this year");
        else if (yearDiff == -1)
            return speech.say("last year");
        return speech.say(this.year.toString());
    }
}
exports.default = AmazonDate;
//# sourceMappingURL=AmazonDate.js.map