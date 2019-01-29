import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";

export class EventsHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        if(wrap.intent && wrap.intent.name === Schema.EventsIntent)
            return true
        else
            return false
    }
    
    async handle(input: HandlerInput) {
        let wrap = new InputWrap(input)

        if(wrap.intent && wrap.slots){
            let isVenue = wrap.slots[Schema.VenueSlot] !== undefined

            let place = isVenue ? wrap.slots[Schema.VenueSlot] : wrap.slots[Schema.LocationSlot]

            //if no place from venue or location, try load from default
            if(!place)
                place = await wrap.getPresistentArr<CustomSlot>(Schema.LocationSlot)
            
            if(place){
                if(place.resId){
                    let slug = place.resId
                    let placeName = place.resValue

                    let req = {
                        location_slug: slug,
                        rows: 5,
                        //sort by date if venue, by popularity if location
                        order: isVenue ? EventRequestOrder.date : EventRequestOrder.popularity
                    } as EventRequest

                    let dateSlot = wrap.slots[Schema.DateSlot]
                    let date: AmazonDate|undefined = undefined
                    if(dateSlot){
                        date = new AmazonDate(dateSlot.value)
                        req.start_date = date.start().toISOString()
                        req.end_date = date.end().toISOString()
                        console.log(JSON.stringify(date))
                    }

                    let events = await getEvents(req)

                    let speech = new AmazonSpeech()
                        .say("I found the following events")
                        .say((isVenue ? "at " : "in ") + placeName)

                    if(date)
                        date.toSpeech(speech)

                    speech.say(":")
                    
                    // let speech = 
                    // `I found the following events ${isVenue ? "at " : "in " + placeName} ${date ? date.toSpeech() : ""}:`
                        
                    events.forEach(event => speech.sentence(event.name))

                    console.log("SPEECH: " + speech.ssml())
        
                    return input.responseBuilder
                        .speak(speech.ssml())
                        .getResponse()
                } else
                    return input.responseBuilder
                        .speak(`Sorry, I don't know anywhere called ${place.value}`)
                        // .reprompt('Try again, speaking clearly and slowly')
                        .getResponse()
            //no location provided
            } else
                return input.responseBuilder
                    .speak(`Please state a location in your question or set your home location`)
                    // .reprompt('You could set your home location to Wellington by saying "Set my location to Wellington"')
                    .getResponse()
        } else{
            throw new Error("VenueHandler Error: " + JSON.stringify(wrap));
        }
    }
}