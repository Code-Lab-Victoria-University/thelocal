import getWeek from "iso-week"
import {padN, mmDD, yyMMDD} from "./Util"
import AmazonSpeech from 'ssml-builder/amazon_speech'

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
            //if no specific date and is current month, then start searching from now?
            if(this.day !== undefined)
                return new Date(this.year, this.month, this.day)
            //if current month, take start as now TODO: am I sure?
            else if(new Date().getMonth() == this.month)
                return new Date()
            //else just take month
            else
                return new Date(this.year, this.month)

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

    //There are three different print categories: week, month, year. Week should be in relation to the curWeek/date. month can be in relation to curWeek, curMonth, monthname or date. year should just be in relation to curYear/yearname.

    toSpeech(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()

        const start = this.start()
        const thisYear = new Date().getFullYear() == this.year
        //relative to current year or absolute
        let yearStr = thisYear ? "????" : this.year.toString()

        let yearDiff = this.year - new Date().getFullYear()
        //yearDiff*12 so that it works across the end of the year
        let monthDiff = (start.getMonth())+yearDiff*12 - new Date().getMonth()
        //TODO: make weekDiff work across year
        const weekDiff = (getWeek(start)) - getWeek()

        //this value is undefined if the week isn't close enough to be one of the three
        let adjacentWeekText = undefined as string|undefined
        if(weekDiff == 1)
            adjacentWeekText = "next"
        else if(weekDiff == 0)
            adjacentWeekText = "this"
        else if(weekDiff == -1)
            adjacentWeekText = "last"

        if(this.week !== undefined){
            //if week type, then follow that print
            let weekOrWeekend = this.weekend ? "weekend" : "week"
            
            //in relation to this week
            if(adjacentWeekText)
                speech.say(adjacentWeekText).say(weekOrWeekend)
            //other week
            else
                speech.say("the").say(weekOrWeekend).say("of").sayAs({
                    word: yearStr + mmDD(start),
                    interpret: "date"
                })
        } else if(this.month !== undefined){
            //used both for date and month variants
            let monthStr = padN(this.month+1, 2)

            if(this.day !== undefined){
                let dayDiff = this.day - new Date().getDate()
                //in relation to today
                if(dayDiff == 1)
                    speech.say("tomorrow")
                else if(dayDiff == 0)
                    speech.say("today")
                else if(dayDiff == -1)
                    speech.say("yesterday")
                //in relation to curWeek
                else if(adjacentWeekText)
                    speech
                        .say(adjacentWeekText)
                        .say(new Intl.DateTimeFormat('en-AU', {
                            weekday: "long"
                        }).format(start))
                //other date
                else
                    speech.say("on").sayAs({
                        interpret: "date",
                        word: yearStr+monthStr+padN(this.day, 2)
                    })
            } else {
                //in relation to curMonth
                if(monthDiff == 1)
                    speech.say("next month")
                else if(monthDiff == 0)
                    speech.say("this month")
                else if(monthDiff == -1)
                    speech.say("last month")
                //other month
                else 
                    speech.say("on").sayAs({
                        word: yearStr+monthStr+"??",
                        interpret: "date"
                    })
            }
        } else {

            //relative to curYear
            if(yearDiff == 1)
                speech.say("next year")
            else if(yearDiff == 0)
                speech.say("this year")
            else if(yearDiff == -1)
                speech.say("last year")
            //other years
            else
                speech.say(this.year.toString())
        }

        return speech
    }
}