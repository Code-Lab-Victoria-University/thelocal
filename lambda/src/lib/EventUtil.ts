import InputWrap, { Slots } from "./InputWrap";
import AmazonSpeech from "ssml-builder/amazon_speech";
import { Event, Response } from "./request";
import AmazonDate from "./AmazonDate";
import { Schema } from "./Schema";

//TODO: use list of lastRequests, and most recent one will be which path we go down in bookmark vs request list
/**
 * 
 * @param wrap 
 * @returns true if bookmark more recent. false if neither or eventsRequest more recent
 */
export function bookmarkMoreRecent(wrap: InputWrap){
    if(wrap.session.prevRequests === undefined)
        return false
        
    // let eventsRequestIndex = Math.max(wrap.session.prevRequests.indexOf(Schema.EventsIntent), )

    return wrap.session.prevRequests.indexOf(Schema.EventsIntent) < 
        wrap.session.prevRequests.indexOf(Schema.ListBookmarksIntent)
}

export function getSpeech(event: Event, speech?: AmazonSpeech) {
    speech = speech || new AmazonSpeech()

    speech.say(event.name)
        .say("is at").say(event.location.name)
        // .say("on").say(event.datetime_summary.replace("-", "to"))
    new AmazonDate(event.datetime_start).toSpeech(speech, true)

    let shortenedDesc = event.description.split(".").reduce((prev, cur) => {
        let newLength = prev.length+cur.length
        if(150 < newLength)
            return prev
        else
            return prev+cur
    })
    return speech.sentence(shortenedDesc)
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