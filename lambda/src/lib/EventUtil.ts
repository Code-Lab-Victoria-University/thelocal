import InputWrap, { Slots } from "./InputWrap";
import { Event, Response } from "./request";
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

export function getPhone(event: Event): string|undefined{
    if(event.booking_phone)
        return event.booking_phone
    else if(event.location){
        if(event.location.booking_phone)
            return event.location.booking_phone
        else if(event.location.contacts) {
            let phoneContact = event.location.contacts.contacts.find(x => x.name.toLowerCase() == "phone")
            if(phoneContact)
                return phoneContact.value
        }
    }

    return undefined;
}