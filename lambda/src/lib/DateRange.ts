import AmazonSpeech from 'ssml-builder/amazon_speech'
import moment, { dateTimeFormat, Moment } from './MomentUtil'

//date and time are inside the start/end strings
export class DateRange {
    readonly start: Moment;
    readonly end: Moment;

    constructor(start: string, end: string){
        this.start = moment(start)
        this.end = moment(end)
    }

    toSpeech(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()

        //end is same day
        if(this.start.diff(this.end, "days") === 0){
            speech.say(this.start.calendar(undefined, dateTimeFormat))
            speech.say("till")
            speech.say(this.end.format("h:mm a"))
        } else{
            speech.say(this.start.calendar())
            speech.say("till")
            speech.say(this.end.calendar())
        }

        return speech
    }
}