import AmazonSpeech from 'ssml-builder/amazon_speech'
import moment, { Moment } from 'moment-timezone'
import AmazonTime from "./AmazonTime";
import DateRange from './DateRange';

export enum Season {
    WINTER = "WI",
    SUMMER = "SU",
    SPRING = "SP",
    FALL = "FA"
}

export default class AmazonDate extends DateRange {
    private readonly startM: Moment;
    private endM: Moment;

    private readonly isOnlyYear: boolean = false;

    private readonly isWeek: boolean = false;
    private readonly isWeekend: boolean = false;

    private readonly isDay: boolean = false;

    // readonly season?: Season;

    constructor(parse: string, endDate?: string){
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

        this.startM = moment(elements.join('-'))
        
        if(endDate)
            this.endM = moment(endDate)
        else {
            let clone = moment(this.startM)
            this.endM = this.isWeek ? clone.endOf('week') :
                this.isOnlyYear ? clone.endOf('year') :
                this.isDay ? clone.endOf('day') :
                clone.endOf('month')
        }
    }

    private time?: AmazonTime;

    setTime(time: AmazonTime) {
        //only set time if single day
        if(!this.isDay)
            return

        this.startM.seconds(time.start().seconds())
            .hours(time.start().hours())
        
        this.endM = this.start().add(AmazonTime.endHours, 'hours')

        this.time = time
    }

    /** Start in NZ timezone */
    start() {
        return moment(this.startM)
    }

    /** End in NZ timezone */
    end() {
        return moment(this.endM)
    }

    //There are three different print categories: week, month, year. Week should be in relation to the curWeek/date. month can be in relation to curWeek, curMonth, monthname or date. year should just be in relation to curYear/yearname.

    toSpeech(speech?: AmazonSpeech, eventPrefix?: boolean): AmazonSpeech{
        speech = speech || new AmazonSpeech()

        // console.log("curdate: " + moment().toString())

        // const start = this.start()
        const thisYear = this.startM.isSame(moment(), 'year')
        //relative to current year or absolute
        const yearStr = thisYear ? "????" : this.startM.year().toString()

        // console.log(this.start().toString(), this.end().toString(), moment().toString())

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

        if(eventPrefix){
            //TODO: some of this is wrong
            let dateBefore = dayDiff < 0
            speech.say(this.start().diff(this.end(), 'days') == 0 ? 
                (dateBefore ? "which was" : "") :
                (dateBefore ? "which started" : "starting"))
        }

        if(this.isWeek){
            //if week type, then follow that print
            const weekOrWeekend = this.isWeekend ? "weekend" : "week"
            
            //in relation to this week
            if(adjacentWeekText)
                speech.say(adjacentWeekText).say(weekOrWeekend)
            //other week
            else
                speech.say("the").say(weekOrWeekend).say("of").sayAs({
                    word: yearStr + this.startM.format('MMDD'),
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
                speech.say(this.startM.year().toString())
        //basic date fallback
        } else {
            //used both for date and month variants
            const monthStr = this.startM.format('MM')

            if(this.isDay) {
                //in relation to today
                if(Math.abs(dayDiff) <= 1 || adjacentWeekText){
                    if(dayDiff == 1)
                        speech.say("tomorrow")
                    else if(dayDiff == 0)
                        speech.say("today")
                    else if(dayDiff == -1)
                        speech.say("yesterday")
                    //in relation to curWeek
                    else if(adjacentWeekText) {
                        if(Math.abs(weekDiff) === 1)
                            speech.say(adjacentWeekText)
                        speech.say(this.startM.format('dddd'))
                    }
                    
                    if(this.time)
                        this.time.toSpeech(speech, true)
                }
                //other date
                else{
                    speech.say("on")
                    if(this.time)
                        this.time.toSpeech(speech.say("the"), true).say("of")
                    speech.sayAs({
                        interpret: "date",
                        word: yearStr+monthStr+this.startM.format('DD')
                    })
                }
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