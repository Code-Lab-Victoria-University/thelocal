import moment, { Moment, unitOfTime } from 'moment-timezone'

export function alignedDiff(to: Moment, format: unitOfTime.Base){
    return to.clone().startOf(format) .diff(moment().startOf(format), format)
}

const sameElseDate: moment.CalendarSpecVal = function(this: Moment, now) {

    const dayDiff = alignedDiff(this, "day")
    const monthDiff = alignedDiff(this, 'months')
    const yearDiff = alignedDiff(this, 'years')
    
    // console.log(`DIFFS: ${dayDi,ff}, ${this.format(" DD/MM")}`)

    if(-7 < dayDiff && dayDiff < 14){
        let text = ""

        if(6 < dayDiff)
            text = "[next] "
        else if(dayDiff < 0)
            text = "[last] "
        
        text += "dddd"

        return text;
    }
    
    if(Math.abs(monthDiff) <= 1){
        let text = "dddd [the] Do"

        if(monthDiff === 1)
            text += " [of next month]"
        else if(monthDiff === -1)
            text += " [of last month]"
        
        return text;
    }

    //not near month, near year though.
    if(Math.abs(yearDiff) <= 1){
        let text = "[the] Do [of] MMMM"

        if(yearDiff == -1)
            text += " [last year]"
        else if(yearDiff == 1){
            text += " [next year]"
        }

        return text;
    }
    
    return 'Do of MMMM YYYY'
}

export const dateOnlyFormat: moment.CalendarSpec =  {
    lastDay : '[yesterday]',
    sameDay : '[today]',
    nextDay : '[tomorrow]',
    lastWeek : '[last] dddd',
    nextWeek : 'dddd',
    sameElse : sameElseDate
}

export const dateTimeFormat: moment.CalendarSpec = {
    lastDay : '[yesterday at] LT',
    sameDay : '[at] LT',
    nextDay : '[tomorrow at] LT',
    lastWeek : 'dddd [at] LT',
    nextWeek : 'dddd [at] LT',
    sameElse : (now) => sameElseDate(now) + ' [at] LT'
}

moment.updateLocale('en', {
    calendar : dateOnlyFormat
});

moment.tz.setDefault("Pacific/Auckland")

export default moment;

export type Moment = Moment;