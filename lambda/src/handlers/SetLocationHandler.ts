import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap from "../lib/InputWrap"
import {getLocations, LocationNode} from '../lib/request'

const slotName = "Location"
const intentName = "SetLocationIntent"

let locations: LocationNode[];
(async() => {
    locations = await getLocations()
})()

export class SetLocationHandler implements RequestHandler {
    canHandle(input: HandlerInput): boolean {
        let wrap = new InputWrap(input);

        if(wrap.intent){
            if(wrap.intent.name === intentName)
                return true
            else if(["YesIntent", "NoIntent"].includes(wrap.intent.name) && wrap.getSessionAttr(slotName))
                return true
        }

        return false
    }

    handle(input: HandlerInput): Response {
        let wrap = new InputWrap(input);

        if(!wrap.intent)
            return input.responseBuilder.speak("ERROR: SetLocationHandler No Intent").getResponse();

        if(wrap.intent.name === intentName && wrap.slots){
            let locationSlot = wrap.slots[slotName]

            let location = locations.find(loc => loc.url_slug == locationSlot.id)
                || locations.find(loc => loc.name.includes(locationSlot.value.toLowerCase()))

            if(location){
                wrap.setSessionAttr(slotName, location)
                let speech = `Do you want to set your location to ${location.name}`
    
                return input.responseBuilder
                    .speak(speech)
                    .reprompt(speech + ". You can answer Yes or No.")
                    .getResponse()
            } else {
                return input.responseBuilder
                    .speak(`No such location as ${locationSlot.value}`)
                    .getResponse()
            }
        } else {
            let location = wrap.getSessionAttr<LocationNode>(slotName)
            let speech: string;
            if(wrap.intent.name === "YesIntent"){
                wrap.setPersistentAttr(slotName, location)
                speech = `Your location is set to ${location.name}`
            } else
                speech = `Not setting your location`

            return input.responseBuilder
                .speak(speech)
                .getResponse()
        }
    }   
}