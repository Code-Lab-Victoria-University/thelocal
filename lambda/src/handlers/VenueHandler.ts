import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap from "../lib/InputWrap"
import {getLocations, LocationNode, getEvents} from '../lib/request'

// let intents = new Intents()

// intents.VenueIntent.slots["Venue"]

let venueSlot = "Venue"
let venueIntent = "VenueIntent"

export class VenueHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        if(wrap.intent && wrap.intent.name === venueIntent)
            return true
        else
            return false
    }    
    
    async handle(input: HandlerInput) {
        let wrap = new InputWrap(input)

        if(wrap.intent && wrap.slots){
            let slug = wrap.slots[venueSlot].id
            let events = await getEvents({
                location_slug: "valhalla-wellington"
            })
            let speech = "I found the following events: "
            events.forEach(event => {
                speech += event.name + ". "
            })
            return input.responseBuilder
                .speak(speech)
                .getResponse()
        } else
            return input.responseBuilder.getResponse()
    }
}