import 'mocha';
import moment, { alignedDiff } from '../lib/MomentUtil'
import assert from 'assert'

describe("Days", () => {
    let day = moment().subtract(10, "days").startOf("day")
    while(day.isBefore(moment().add(8, "days"))){
        const dayText = day.calendar().toLowerCase()
        const dayDiff = alignedDiff(day, "days")

        console.log(dayText)

        it(dayText + day.format(" | L | ") + dayDiff, () => {
            assert.notStrictEqual(day, null)

            if(dayDiff == 0)
                assert.strictEqual(dayText, "today")
            else if(dayDiff == 1)
                assert.strictEqual(dayText, "tomorrow")
            else if(dayDiff == -1)
                assert.strictEqual(dayText, "yesterday")
            else if(-7 < dayDiff && dayDiff < 0)
                assert(dayText.startsWith("last"))
        })

        day.add(1, "day")
    }
})

describe("Months", () => {
    let month = moment().subtract(20, "months").add(10, "days")

    while(month.isBefore(moment().add(20, "months"))){
        var monthText = month.calendar().toLowerCase()
        var yearDiff = alignedDiff(month, "years")
        console.log(monthText)

        it(monthText + month.format(" | L | ") + yearDiff, () => {
            assert.notStrictEqual(month, null)

            if(yearDiff == -1)
                assert(monthText.endsWith("last year"))
            else if(yearDiff == 1)
                assert(monthText.endsWith("next year"))
            else if(1 < Math.abs(yearDiff)){
                assert(monthText.endsWith(month.format('YYYY')))
            }
        })

        month.add(3, "months")
    }
})