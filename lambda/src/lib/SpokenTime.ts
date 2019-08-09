import AmazonSpeech from "ssml-builder/amazon_speech";

export enum TimePeriod{
    NIGHT = "NI",
    MORNING = "MO",
    AFTERNOON = "AF",
    EVENING = "EV"
}

export default class SpokenTime {
    readonly hours: number = 0;
    readonly minutes: number = 0;

    readonly timeStr: string | TimePeriod;

    static readonly endHours: number = 6

    constructor(spokenTime: string){
        this.timeStr = spokenTime
        if(spokenTime.includes(":"))
            [this.hours, this.minutes] = spokenTime.split(":").map(val => Number.parseInt(val))
        else {
            if(spokenTime == TimePeriod.MORNING)
                this.hours = 8 //8am
            else if (spokenTime == TimePeriod.AFTERNOON)
                this.hours = 12 //12pm
            else if (spokenTime == TimePeriod.EVENING)
                this.hours = 17 //5pm
            else if (spokenTime == TimePeriod.NIGHT)
                this.hours = 20 //8pm
        }
    }

    toSpeech(speech?: AmazonSpeech, isToday?: boolean): AmazonSpeech {
        speech = speech || new AmazonSpeech()

        const prefixStr =isToday ? "this " : "in the "

        const nightPrefix = isToday ? "to": "at "

        switch(this.timeStr){
            case TimePeriod.MORNING:
                speech.say(prefixStr + "morning")
                break;
            case TimePeriod.AFTERNOON:
                speech.say(prefixStr + "afternoon")
                break;
            case TimePeriod.EVENING:
                speech.say(prefixStr + "evening")
                break;
            case TimePeriod.NIGHT:
                speech.say(nightPrefix + "night")
                break;
            default:
                speech.say("at").sayAs({
                    interpret: "time",
                    word: this.timeStr
                })
        }
        
        return speech
    }
}