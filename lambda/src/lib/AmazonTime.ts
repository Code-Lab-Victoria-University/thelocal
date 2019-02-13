import DateRange from "./DateRange";
import AmazonSpeech from "ssml-builder/amazon_speech";
import moment = require("moment-timezone");

export enum TimePeriod{
    NIGHT = "NI",
    MORNING = "MO",
    AFTERNOON = "AF",
    EVENING = "EV"
}

export default class AmazonTime extends DateRange {
    readonly hours: number = 0;
    readonly minutes: number = 0;

    readonly timeStr: string | TimePeriod;

    static readonly endHours: number = 6

    constructor(time: string){
        super()
        this.timeStr = time
        if(time.includes(":"))
            [this.hours, this.minutes] = time.split(":").map(val => Number.parseInt(val))
        else {
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

    start(){
        return moment().hours(this.hours).minutes(this.minutes)
    }

    end(){
        return this.start().add(AmazonTime.endHours, 'hours')
    }

    toSpeech(speech?: AmazonSpeech, noPrefix?: boolean): AmazonSpeech {
        speech = speech || new AmazonSpeech()

        switch(this.timeStr){
            case TimePeriod.MORNING:
                speech.say((noPrefix ? "" : "This ") + "morning")
                break;
            case TimePeriod.AFTERNOON:
                speech.say((noPrefix ? "" : "This ") + "afternoon")
                break;
            case TimePeriod.EVENING:
                speech.say((noPrefix ? "" : "This ") + "evening")
                break;
            case TimePeriod.NIGHT:
                speech.say((noPrefix ? "" : "To") + "night")
                break;
            default:
                speech.sayAs({
                    interpret: "time",
                    word: this.timeStr
                })
        }
        
        return speech
    }
}