import InputWrap, { Slots } from "./InputWrap";
import AmazonSpeech from "ssml-builder/amazon_speech";
import { Event, Response } from "./request";
import AmazonDate from "./AmazonDate";
import { Schema } from "./Schema";

//TODO: use list of lastRequests, and most recent one will be which path we go down in bookmark vs request list
export function bookmarkMoreRecent(wrap: InputWrap){
    return wrap.session.prevRequests !== undefined &&
        wrap.session.prevRequests.indexOf(Schema.EventsIntent) < 
        wrap.session.prevRequests.indexOf(Schema.ListBookmarksIntent)
}

export function getSpeech(event: Event, speech?: AmazonSpeech) {
    speech = speech || new AmazonSpeech()

    speech.say(event.name)
        .say("is at").say(event.location.name)
        // .say("on").say(event.datetime_summary.replace("-", "to"))
    new AmazonDate(event.datetime_start).toSpeech(speech, true)
    return speech.sentence(event.description)
}

export function getEvent(eventsOrResponse?: Event[]|Response<Event>, slots?: Slots): Event|undefined {
    let events;

    if(eventsOrResponse instanceof Array)
        events = eventsOrResponse
    else if(eventsOrResponse)
        events = eventsOrResponse.list

    if(events && slots){
        let numSlot = slots[Schema.NumberSlot]
        if(numSlot){
            let number = Number.parseInt(numSlot.value)
            if(number <= events.length)
                return events[number-1]
        }
    }

    return undefined
}