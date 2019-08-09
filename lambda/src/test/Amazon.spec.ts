import assert from 'assert';
import 'mocha';
import AmazonSpeech from 'ssml-builder/amazon_speech';
import { SpokenDateTime } from "../lib/SpokenDateTime";
import { padN } from '../lib/Util';
import { alignedDiff } from '../lib/MomentUtil';


let now = new Date()
let year = now.getFullYear()
let month = now.getMonth()

let tomorrow = new Date()
tomorrow.setDate(now.getDate()+1)

//TODO: do tests with different timezones
let yesterday = new Date()
yesterday.setDate(now.getDate()-1)

function toAZNStr(date: Date): string{
    return `${date.getFullYear()}-${padN(date.getMonth()+1, 2)}-${padN(date.getDate(), 2)}`
}

function speakWrap(text: string){
    return`<speak>${text}</speak>`
}

let testPairs = [
    [toAZNStr(yesterday), "yesterday"],
    [toAZNStr(now), "today"],
    [toAZNStr(tomorrow), "tomorrow"],
    [[year-1, "XX", "XX"].join('-'), "last year"],
    [[year, "XX", "XX"].join('-'), "this year"],
    [[year+1, "XX", "XX"].join('-'), "next year"],
    [[year, padN(month+1, 2), "XX"].join('-'), "this month"]
]
// datePairs.forEach(pair => console.log(pair + " " + dateToStr(pair[0] as Date)))

describe("DatePrint", () => {
    for(let testPair of testPairs){
        let dateStr = testPair[0]
        let expected = testPair[1]

        let dateObj = new SpokenDateTime(dateStr)
        let ssml = dateObj.toSpeech().ssml()

        it(`${dateStr} => ${expected}`, () => {
            assert.equal(ssml, speakWrap(expected), JSON.stringify(dateObj))
        })
    }
})

describe("Times", () => {
    // let times = [new SpokenDateTime(toAZNStr(tomorrow), "NI"),
    //     new SpokenDateTime(toAZNStr(today), "NI")]
    let time = 'NI'

    testPairs.forEach(testPair => {
        let dateStr = testPair[0]
        let date = new SpokenDateTime(dateStr, time)
        let dayDiff = alignedDiff(date.start(), "day")
        dateStr += " " + time

        let expected = testPair[1]

        if(date.isDay){
            if(dayDiff == 0)
                expected = "tonight"
            else
                expected += " at night"
        }

        it(`${dateStr} => ${expected}`, () => {
            assert.strictEqual(date.toSpeech().ssml(), speakWrap(expected))
        })
    })
})

describe("Speech", () => {
    it("Event print stuff with various tests", () => {
        let resp = new AmazonSpeech().say("For").say("The event")
                            .say("ask for number").say((0+1).toString()).pauseByStrength("strong").ssml()
        assert.equal(resp, "<speak>For The event ask for number 1 <break strength='strong'/></speak>");
    })
})