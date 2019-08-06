import AmazonSpeech from 'ssml-builder/amazon_speech'
import SpokenTime from "./SpokenTime";
import moment, {Moment} from './MomentUtil'

//TODO: test on device

export enum Season {
    WINTER = "WI",
    SUMMER = "SU",
    SPRING = "SP",
    FALL = "FA"
}

//date and time are separate slots
export class DateTime {
    readonly date: Moment;

    readonly isYear: boolean = false;
    readonly isWeekend: boolean = false;
    readonly isWeek: boolean = false;
    readonly isMonth: boolean = false;
    readonly isDay: boolean = false;

    readonly time?: SpokenTime;

    constructor(spokenDate: string|undefined, spokenTime?: string|undefined){
        if(spokenDate !== undefined){
            let elements = spokenDate.split(" ")[0].split("-").filter(el => el != "XX")
            
            //error if year contains no-digit (not supporting decade format)
            if(elements[0].match(/\D/))
                throw new Error("Year contained non-digit while parsing: "+ spokenDate)
        
            //only has year
            if(elements[1] === undefined){
                this.isYear = true
                elements[1] = "01"
                elements[2] = "01"
    
            //has week/weekend
            } else if(elements[1].match(/^W\d+$/)){
                this.isWeekend = elements[2] === "WE"
    
                if(this.isWeekend)
                    elements[2] = "5"
                else
                    this.isWeek = true
    
            //has month/date
            } else if(elements[1].match(/^\d+$/)) {
                //zero indexed
                if(elements[2] && elements[2].match(/^\d+$/))
                    this.isDay = true
                else{
                    this.isMonth = true;
                    elements[2] = "01"
                }
            }
    
            this.date = moment(elements.join('-')).startOf("day")
        } else
            this.date = moment().startOf("day")

        if(spokenTime)
            this.time = new SpokenTime(spokenTime)
    }

    static fromSpoken(spokenDate: string|undefined, spokenTime?: string|undefined){

    }

    start(){
        if(this.time)
            return this.date.clone().hours(this.time.hours).minutes(this.time.minutes)
        else
            return this.date;
    }

    end(){
        if(this.time)
            return this.date.clone().hours(this.time.hours).minutes(this.time.minutes).add("hours", SpokenTime.endHours)
        else
            return this.date.clone().endOf("day");
    }

    //There are three different print categories: week, month, year. Week should be in relation to the curWeek/date. month can be in relation to curWeek, curMonth, monthname or date. year should just be in relation to curYear/yearname.
    toSpeech(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()

        const thisYear = this.date.isSame(moment(), 'year')
        //relative to current year or absolute
        const yearStr = thisYear ? "????" : this.date.year().toString()
        const weekDiff = this.date.clone().startOf('isoWeek').diff(moment().startOf('isoWeek'), 'weeks')
        const monthDiff = this.date.clone().startOf('month').diff(moment().startOf('month'), 'months')
        const yearDiff = this.date.clone().startOf('year').diff(moment().startOf('year'), 'years')
 
        //this value is undefined if the week isn't close enough to be one of the three
        let adjacentWeekText = undefined as string|undefined
        if(weekDiff == 1)
            adjacentWeekText = "next"
        else if(weekDiff == 0)
            adjacentWeekText = "this"
        else if(weekDiff == -1)
            adjacentWeekText = "last"

        //specified week or weekend
        if(this.isWeek || this.isWeekend){

            //if week type, then follow that print
            const weekOrWeekend = this.isWeekend ? "weekend" : "week"
            
            //in relation to this week
            if(adjacentWeekText !== undefined)
                speech.say(adjacentWeekText).say(weekOrWeekend)
            //other week
            else
                speech.say("the").say(weekOrWeekend).say("of").sayAs({
                    word: yearStr + this.date.format('MMDD'),
                    interpret: "date"
                })

        //specified year
        } else if (this.isYear) {
            if(yearDiff == 1)
                speech.say("next year")
            else if(yearDiff == 0)
                speech.say("this year")
            else if(yearDiff == -1)
                speech.say("last year")
            else
                speech.say(this.date.year().toString())

        //calendar month
        } else if(this.isMonth) {
            //used both for date and month variants
            const monthStr = this.date.format('MM')
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

        //specific date
        } else {
            speech.say(this.date.calendar())
        }

        if(this.time)
            this.time.toSpeech(speech)

        return speech;
    }
}