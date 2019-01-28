import getWeek from "iso-week"
import {padN, mmDD, yyMMDD} from "./Util"

export enum Season {
    WINTER = "WI",
    SUMMER = "SU",
    SPRING = "SP",
    FALL = "FA"
}

export default class AmazonDate {
    readonly year: number;

    /** zero indexed month */
    readonly month?: number;
    /** 1 indexed day */
    readonly day?: number;

    readonly week?: number;
    readonly weekend?: boolean;

    readonly season?: Season;

    constructor(parse: string){
        let elements = parse.split("-")
        
        //error if year contains no-digit (not supporting decade format)
        if(elements[0].match(/\D/))
            throw new Error("Year contained non-digit while parsing: "+ parse)
        else
            this.year = Number.parseInt(elements[0])

        //no more elements
        if(elements[1] === undefined)
            return

        // W51 week element format
        if(elements[1].match(/^W\d+$/)){
            this.week = Number.parseInt(elements[1].slice(1))
            this.weekend = elements[2] == "WE"

        //month element
        } else if(elements[1].match(/^\d+$/)){
            //zero indexed
            this.month = Number.parseInt(elements[1])-1
            if(elements[2] !== undefined && elements[2].match(/^\d+$/))
                this.day = Number.parseInt(elements[2])

        //season element
        } else if(elements[1].match(/^\D+$/))
            this.season = elements[1] as Season
    }

    /** Start for api requests */
    start(): Date {
        if(this.week !== undefined){
            //month is 0-indexed, day isn't.
            let firstDay = new Date(this.year, 0, 1);
            //first day of year => days to first monday from 1st: Sunday = +1, Monday = +0, Tuesday = -1
            let firstMonday = 1-firstDay.getDay()
            //TODO: consider friday part of the weekend?
            let weekendMod = this.weekend ? 5 : 0
            //first day needs a 1 in the day as it isn't 0-this.start()indexed
            return new Date(this.year, 0, 1+firstMonday+this.week*7+weekendMod)
            
        } else if(this.month !== undefined){
            //TODO: should it be now or be the whole month including past days?
            //if no specific date and is current month, then start searching from now?
            if(this.day !== undefined && new Date().getMonth() == this.month)
                return new Date()
            //else take start of month or day if exists
            return new Date(this.year, this.month, this.day)

        //TODO: handle season
        } else
            return new Date(this.year)
    }

    /** End for api requests */
    end(): Date {
        if(this.week !== undefined){
            //end of week/end
            let monday = this.start()
            monday.setDate(monday.getDate()+(this.weekend ? 2 : 7))
            monday.setMilliseconds(-1)
            return monday
        } else if(this.month !== undefined){
            if(this.day !== undefined){
                //end of day
                let startDay = new Date(this.year, this.month, this.day+1)
                startDay.setMilliseconds(-1)
                return startDay
            }

            //end of current month, even if start is part way through
            let first = new Date(this.year, this.month+1)
            first.setMilliseconds(-1)
            return first
        } else {
            //end of year
            let endYear = new Date(this.year+1, 0, 1)
            endYear.setMilliseconds(-1)
            return endYear
        }
    }

    toString(): string{
        let start = this.start()
        let thisYear = new Date().getFullYear() == this.year

        if(this.week !== undefined){
            let weeksToGo = this.week - getWeek()
            let prefix = this.weekend ? "weekend" : "week"
            if(weeksToGo == 1)
                return "Next " + prefix
            else if(weeksToGo == 0)
                return "This " + prefix
            else if(weeksToGo == -1)
                return "Last " + prefix

            let date = thisYear ?
                `on <say-as interpret-as="date">????${mmDD(start)}</say-as>` :
                `on <say-as interpret-as="date" format="mdy">${yyMMDD(start)}</say-as>`

            return `The ${prefix} starting on ${date}`
        } else if(this.month !== undefined){
            let monthsToGo = this.month - new Date().getMonth()
            if(monthsToGo == 1)
                return "next month"
            else if(monthsToGo == 0) {
                if(this.day !== undefined){
                    let dayDiff = this.day - new Date().getDate()
                    if(dayDiff == 1)
                        return "tomorrow"
                    else if(dayDiff == 0)
                        return "today"
                    else if(dayDiff == -1)
                        return "yesterday"
                } else
                    return "this month"
            } else if(monthsToGo == -1)
                return "last month"
            
            let dayStr = this.day !== undefined ? padN(start.getDate(), 2) : "??"
            let monthStr = padN(start.getMonth()+1, 2)
            let yearStr = thisYear ? "??" : start.getFullYear().toString()
            return `on <say-as interpret-as="date" format="mdy">${yearStr+monthStr+dayStr}</say-as>`
        }

        let yearDiff = this.year - new Date().getFullYear()
        if(yearDiff == 1)
            return "next year"
        else if(yearDiff == 0)
            return "this year"
        else if(yearDiff == -1)
            return "last year"

        return this.year.toString()
    }
}