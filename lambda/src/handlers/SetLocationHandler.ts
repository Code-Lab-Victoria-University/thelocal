import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getLocations, LocationNode} from '../lib/request'
import {Schema} from '../lib/Schema'

export class SetLocationHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        if(wrap.intent){
            if(wrap.intent.name === Schema.SetLocationIntent)
                return true
            else if(["YesIntent", "NoIntent"].includes(wrap.intent.name) && wrap.getSessionAttr(Schema.LocationSlot))
                return true
        }

        return false
    }

    handle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        if(!wrap.intent)
            return input.responseBuilder.speak("ERROR: SetLocationHandler No Intent").getResponse();

        if(wrap.intent.name === Schema.SetLocationIntent){

            let locationSlot = wrap.slots && wrap.slots[Schema.LocationSlot]

            if(locationSlot){
                if(locationSlot.value){
                    wrap.setSessionAttr(Schema.LocationSlot, locationSlot)
                    let speech = `Do you want to set your location to ${locationSlot.value}`
        
                    return input.responseBuilder
                        .speak(speech)
                        .reprompt(speech + ", Yes or No")
                        .getResponse()
                } else
                    return input.responseBuilder
                        .speak(`No such location as ${locationSlot.value}`)
                        .getResponse()
            } else
                return input.responseBuilder
                    .speak("You tried to set your location but I didn't understand. Make sure to say your location slowly and clearly")
                    .getResponse()
        } else {
            //assuming value in session attrs, as only other way for handler to return
            let location = wrap.getSessionAttr<CustomSlot>(Schema.LocationSlot)!
            let speech: string;
            if(wrap.intent.name === "YesIntent"){
                wrap.setPersistentAttr(Schema.LocationSlot, location)
                speech = `Your location is set to ${location.value}`
            } else
                speech = `Not setting your location`

            return input.responseBuilder
                .speak(speech)
                .getResponse()
        }
    }   
}