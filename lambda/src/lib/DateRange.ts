import moment, { Moment } from 'moment-timezone'
import AmazonSpeech from 'ssml-builder/amazon_speech'

const ISOformat = "YYYY-MM-DDTHH:MM"

moment.tz.setDefault("Pacific/Auckland")

export default abstract class DateRange {
    //remove the Z indication, meaning local time.
    startISO(): string {
        return this.start().format(ISOformat)
    }
    endISO(): string {
        return this.end().format(ISOformat)
    }

    // static now(): Moment {
    //     // return new Date()
    //     return moment()
    //     // return moment.tz("Pacific/Auckland").ut
    //     // return new Date()
    // }

    abstract start(): Moment
    abstract end(): Moment
    abstract toSpeech(speech?: AmazonSpeech): AmazonSpeech
}