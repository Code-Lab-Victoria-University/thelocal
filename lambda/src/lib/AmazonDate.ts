import getWeek from "iso-week"
import {padN, mmDD, yyMMDD} from "./Util"
import AmazonSpeech from 'ssml-builder/amazon_speech'
import moment, { Moment } from 'moment'

export enum Season {
    WINTER = "WI",
    SUMMER = "SU",
    SPRING = "SP",
    FALL = "FA"
}

export abstract class DateRange {
    //remove the Z indication, meaning local time.
    startISO(): string {
        return this.start().toISOString().split('Z')[0]
    }
    endISO(): string {
        return this.end().toISOString().split('Z')[0]
    }

    // protected now(): Moment {
    //     // return new Date()
    //     return moment()
    //     // return new Date(new Date().toLocaleString("eu-AU", {
    //     //     timeZone: "Pacific/Auckland"
    //     // }))
    // }

    protected abstract start(): Moment
    protected abstract end(): Moment
    abstract toSpeech(speech?: AmazonSpeech): AmazonSpeech
}

//Should have just used moment.js

export default class AmazonDate extends DateRange {
    readonly date: Moment;

    // /** zero indexed month */
    // readonly month?: number;
    // /** 1 indexed day */
    // readonly day?: number;

    readonly isOnlyYear: boolean = false;

    readonly isWeek: boolean = false;
    readonly isWeekend: boolean = false;

    readonly isDay: boolean = false;

    // readonly season?: Season;

    constructor(parse: string){
        super()

        //take first space element (ignore time on full ISO)
        let elements = parse.split(" ")[0].split("-").filter(el => el != "XX")
        
        //error if year contains no-digit (not supporting decade format)
        if(elements[0].match(/\D/))
            throw new Error("Year contained non-digit while parsing: "+ parse)

        //only has year
        if(elements[1] === undefined){
            this.isOnlyYear = true
            elements[1] = "01"
            elements[2] = "01"
        //has week/weekend
        }else if(elements[1].match(/^W\d+$/)){
            this.isWeek = true
            this.isWeekend = elements[2] === "WE"
            if(this.isWeekend)
                elements[2] = "5"
        //has month/date
        } else if(elements[1].match(/^\d+$/)) {
            //zero indexed
            if(elements[2] && elements[2].match(/^\d+$/))
                this.isDay = true
            else
                elements[2] = "01"
        }

        this.date = moment(elements.join('-'))
    }

    /** Start in NZ timezone */
    protected start() {
        return moment(this.date)
    }

    /** End in NZ timezone */
    protected end() {
        let clone = moment(this.date)
        return this.isWeek ? clone.endOf('week') :
            this.isOnlyYear ? clone.endOf('year') :
            this.isDay ? clone.endOf('day') :
            clone.endOf('month')
    }

    //There are three different print categories: week, month, year. Week should be in relation to the curWeek/date. month can be in relation to curWeek, curMonth, monthname or date. year should just be in relation to curYear/yearname.

    toSpeech(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()

        // console.log("curdate: " + this.now().toString())

        // const start = this.start()
        const thisYear = this.date.isSame(moment(), 'year')
        //relative to current year or absolute
        const yearStr = thisYear ? "????" : this.date.year().toString()

        console.log(this.start().startOf('day'), moment().startOf('day'))

        const dayDiff = this.start().startOf('day').diff(moment().startOf('day'), 'days')
        const weekDiff = this.start().startOf('isoWeek').diff(moment().startOf('isoWeek'), 'weeks')
        const monthDiff = this.start().startOf('month').diff(moment().startOf('month'), 'months')
        const yearDiff = this.start().startOf('year').diff(moment().startOf('year'), 'years')

        //this value is undefined if the week isn't close enough to be one of the three
        let adjacentWeekText = undefined as string|undefined
        if(weekDiff == 1)
            adjacentWeekText = "next"
        else if(weekDiff == 0)
            adjacentWeekText = "this"
        else if(weekDiff == -1)
            adjacentWeekText = "last"

        if(this.isWeek){
            //if week type, then follow that print
            const weekOrWeekend = this.isWeekend ? "weekend" : "week"
            
            //in relation to this week
            if(adjacentWeekText)
                speech.say(adjacentWeekText).say(weekOrWeekend)
            //other week
            else
                speech.say("the").say(weekOrWeekend).say("of").sayAs({
                    word: yearStr + this.date.format('MMDD'),
                    interpret: "date"
                })
        //specified only year
        } else if (this.isOnlyYear) {
            if(yearDiff == 1)
                speech.say("next year")
            else if(yearDiff == 0)
                speech.say("this year")
            else if(yearDiff == -1)
                speech.say("last year")
            else
                speech.say(this.date.year().toString())
        //basic date fallback
        } else {
            //used both for date and month variants
            const monthStr = this.date.format('MM')

            if(this.isDay) {
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
                        .say(this.date.format('dddd'))
                //other date
                else
                    speech.say("on").sayAs({
                        interpret: "date",
                        word: yearStr+monthStr+this.date.format('DD')
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
        }

        return speech
    }
}