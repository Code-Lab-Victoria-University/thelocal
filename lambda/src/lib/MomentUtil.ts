import moment, { Moment } from 'moment-timezone'

const sameElseDate: moment.CalendarSpecVal = function(this: Moment, now) {

    const weekDiff = this.clone().startOf('isoWeek').diff(moment().startOf('isoWeek'), 'weeks')
    const monthDiff = this.clone().startOf('month').diff(moment().startOf('month'), 'months')
    const yearDiff = this.clone().startOf('year').diff(moment().startOf('year'), 'years')
    
    console.log(`DIFFS: ${weekDiff} ${monthDiff} ${yearDiff}`)

    if(Math.abs(weekDiff) <= 1){
        let text = ""

        if(weekDiff === 1)
            text = "[next]"
        else if(weekDiff === 0)
            text = "[this]"
        else if(weekDiff === -1)
            text = "[last]"
        
        text += " dddd"

        return text;
    }
    
    if(Math.abs(monthDiff) <= 1 || Math.abs(yearDiff) <= 1){
        let text = "[the] Mo [of] "

        if(monthDiff === 1)
            text += "[next month]"
        else if(monthDiff === 0)
            text += "[this month]"
        else if(monthDiff === -1)
            text += "[last month]"
        
        return text;
    }

    //not near month, near year though.
    if(yearDiff == 1 || yearDiff == -1){
        let text = "MMMM [the] Mo "

        if(yearDiff == -1)
            text += "[last year]"
        else if(yearDiff == 1){
            text += "[next year]"
        }

        return text;
    }
    
    return 'LL'
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
    sameDay : '[today at] LT',
    nextDay : '[tomorrow at] LT',
    lastWeek : '[last] dddd [at] LT',
    nextWeek : 'dddd [at] LT',
    sameElse : (now) => sameElseDate(now) + 'LT'
}

moment.updateLocale('en', {
    calendar : dateOnlyFormat
});

moment.tz.setDefault("Pacific/Auckland")

export default moment;

export type Moment = Moment;