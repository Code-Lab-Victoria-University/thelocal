import 'mocha'
import assert, { AssertionError } from 'assert'
import AmazonDate from "../lib/AmazonDate";
import {padN} from '../lib/Util'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonTime from '../lib/AmazonTime';

let now = new Date()
let year = now.getFullYear()
let month = now.getMonth()

let tomorrow = new Date()
tomorrow.setDate(now.getDate()+1)

//TODO: do tests with different timezones

let yesterday = new Date()
yesterday.setDate(now.getDate()-1)

function dateToStr(date: Date): string{
    return `${date.getFullYear()}-${padN(date.getMonth()+1, 2)}-${padN(date.getDate(), 2)}`
}

let datePairs = [
    [dateToStr(yesterday), "yesterday"],
    [dateToStr(now), "today"],
    [dateToStr(tomorrow), "tomorrow"],
    [[year-1, "XX", "XX"].join('-'), "last year"],
    [[year, "XX", "XX"].join('-'), "this year"],
    [[year+1, "XX", "XX"].join('-'), "next year"],
    [[year, padN(month+1, 2), "XX"].join('-'), "this month"]
]
// datePairs.forEach(pair => console.log(pair + " " + dateToStr(pair[0] as Date)))

describe("DatePrint", () => {
    for(let testPair of datePairs){
        let dateStr = testPair[0]
        let expected = testPair[1]
        let dateObj = new AmazonDate(dateStr)
        let ssml = dateObj.toSpeech().ssml()

        let expectedSsml = `<speak>${expected}</speak>`

        it(`${dateStr} should become ${expected}`, () => {
            assert.equal(ssml, expectedSsml, JSON.stringify(dateObj))
        })
    }
})

describe("DateTime", () => {
    let dateObj = new AmazonDate(dateToStr(tomorrow))
    let timeObj = new AmazonTime("NI")

    dateObj.setTime(timeObj)
    it(`should be tomorrow night`, () => {
        assert.equal(dateObj.toSpeech().ssml(), "<speak>tomorrow night</speak>")
    })
})

describe("Speech", () => {
    it("Event print stuff with various tests", () => {
        let resp = new AmazonSpeech().say("For").say("The event")
                            .say("ask for number").say((0+1).toString()).pauseByStrength("strong").ssml()
        assert.equal(resp, "<speak>For The event ask for number 1 <break strength='strong'/></speak>");
    })
})