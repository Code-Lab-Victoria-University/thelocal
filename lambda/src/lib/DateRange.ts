import AmazonSpeech from 'ssml-builder/amazon_speech'
import moment, { dateTimeFormat, Moment } from './MomentUtil'
import { Event, Times } from './request';

//date and time are inside the start/end strings
export class DateRange {
    readonly start: Moment;
    readonly end: Moment;

    constructor(event: Event, from?: Moment, to?: Moment){
        let curSession: Times|undefined;
        if(event.sessions)
            curSession = event.sessions.sessions.find(sess => moment(sess.datetime_start).isBefore(to) && moment(sess.datetime_end).isAfter(from))
        
        this.start = moment((curSession || event).datetime_start)
        this.end = moment((curSession || event).datetime_end)
    }

    toSpeech(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()
            
        speech.say(this.start.isBefore() ? "from" : "on")

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