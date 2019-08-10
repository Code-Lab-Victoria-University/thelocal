import 'mocha';
import moment, { alignedDiff } from '../lib/MomentUtil'
import assert from 'assert'

console.log(moment().startOf('week').format('ddd'))

describe("Days", () => {
    let dayDiffs = [-15, -10, -5, -3, -2, -1]
    dayDiffs = [
        ...dayDiffs,
        0,
        ...dayDiffs.reverse().map(diff => -diff)
    ]

    dayDiffs.forEach(diff => {
        let day = moment().add(diff, "days")

        const dayText = day.calendar().toLowerCase()
        const dayDiff = alignedDiff(day, "days")
        const weekDiff = alignedDiff(day, "weeks")

        it(dayText + day.format(" | L"), () => {
            assert.notStrictEqual(day, null)

            if(dayDiff == 0)
                assert.strictEqual(dayText, "today")
            else if(dayDiff == 1)
                assert.strictEqual(dayText, "tomorrow")
            else if(dayDiff == -1)
                assert.strictEqual(dayText, "yesterday")

            else if(weekDiff == -1)
                assert(dayText.startsWith("last"))
            else if(weekDiff == 0)
                assert(dayText.startsWith("this"))
            else if(weekDiff == 1)
                assert(dayText.startsWith("next"))
        })
    })
})

describe("Months", () => {
    let monthDiffs = [-50, -12, -3, -1]
    monthDiffs = [
        ...monthDiffs,
        0,
        ...monthDiffs.reverse().map(diff => -diff)
    ]

    monthDiffs.forEach(diff => {
        let month = moment().add(diff, "months")

        var monthText = month.calendar().toLowerCase()
        var yearDiff = alignedDiff(month, "years")

        it(monthText + month.format(" | L"), () => {
            assert.notStrictEqual(month, null)

            if(yearDiff == -1)
                assert(monthText.endsWith("last year"))
            else if(yearDiff == 1)
                assert(monthText.endsWith("next year"))
            else if(1 < Math.abs(yearDiff)){
                assert(monthText.endsWith(month.format('YYYY')))
            }
        })
    })
})