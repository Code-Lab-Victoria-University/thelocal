"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const assert_1 = __importDefault(require("assert"));
const AmazonDate_1 = __importDefault(require("../lib/AmazonDate"));
const Util_1 = require("../lib/Util");
let now = new Date();
let year = now.getFullYear();
let month = now.getMonth();
let tomorrow = new Date();
tomorrow.setDate(now.getDate() + 1);
//TODO: do tests with different timezones
let yesterday = new Date();
yesterday.setDate(now.getDate() - 1);
function dateToStr(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
let datePairs = [
    [dateToStr(yesterday), "yesterday"],
    [dateToStr(now), "today"],
    [dateToStr(tomorrow), "tomorrow"],
    [[year - 1, "XX", "XX"].join('-'), "last year"],
    [[year, "XX", "XX"].join('-'), "this year"],
    [[year + 1, "XX", "XX"].join('-'), "next year"],
    [[year, Util_1.padN(month + 1, 2), "XX"].join('-'), "this month"]
];
// datePairs.forEach(pair => console.log(pair + " " + dateToStr(pair[0] as Date)))
describe("DatePrint", () => {
    for (let testPair of datePairs) {
        let dateStr = testPair[0];
        let dateObj = new AmazonDate_1.default(dateStr);
        let ssml = dateObj.toSpeech().ssml();
        let expected = testPair[1];
        let expectedSsml = `<speak>${expected}</speak>`;
        it(`${dateStr} should become ${expected}`, () => {
            assert_1.default.equal(ssml, expectedSsml, JSON.stringify(dateObj));
        });
    }
});
//# sourceMappingURL=AmazonDate.spec.js.map