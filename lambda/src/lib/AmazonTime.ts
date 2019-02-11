import { DateRange } from "./AmazonDate";
import AmazonSpeech from "ssml-builder/amazon_speech";
import moment = require("moment");

export enum TimePeriod{
    NIGHT = "NI",
    MORNING = "MO",
    AFTERNOON = "AF",
    EVENING = "EV"
}

export default class AmazonTime extends DateRange {
    readonly hours: number = 0;
    readonly minutes: number = 0;

    readonly timeStr: string;
    readonly isPeriod: boolean = false;

    constructor(time: string){
        super()
        this.timeStr = time
        if(time.includes(":"))
            [this.hours, this.minutes] = time.split(":").map(val => Number.parseInt(val))
        else {
            this.isPeriod = true
            if(time == TimePeriod.MORNING)
                this.hours = 8 //8am
            else if (time == TimePeriod.AFTERNOON)
                this.hours = 12 //12pm
            else if (time == TimePeriod.EVENING)
                this.hours = 17 //5pm
            else if (time == TimePeriod.NIGHT)
                this.hours = 20 //8pm
        }
    }

    protected start(){
        return moment().hours(this.hours).minutes(this.minutes)
    }

    protected end(){
        return this.start().add(6, 'hours')
    }

    toSpeech(speech?: AmazonSpeech | undefined): AmazonSpeech {
        speech = speech || new AmazonSpeech()
        if(this.isPeriod)
            switch(this.timeStr as TimePeriod){
                case TimePeriod.MORNING:
                    speech.say("This morning")
                    break;
                case TimePeriod.AFTERNOON:
                    speech.say("This afternoon")
                    break;
                case TimePeriod.EVENING:
                    speech.say("This evening")
                    break;
                case TimePeriod.NIGHT:
                    speech.say("Tonight")
                    break;
            }
        else
            speech.sayAs({
                interpret: "time",
                word: this.timeStr
            })

        return speech
    }
}