import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getLocations, Node} from '../lib/request'
import {Schema} from '../lib/Schema'

export class SetLocationHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        return wrap.isIntent(Schema.SetLocationIntent) ||
            wrap.isIntent([Schema.YesIntent, Schema.NoIntent]) && wrap.hasSessionAttr(Schema.LocationSlot)
    }

    handle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        if(!wrap.intent)
            return input.responseBuilder.speak("ERROR: SetLocationHandler No Intent").getResponse();

        if(wrap.isIntent(Schema.SetLocationIntent)){

            let locationSlot = wrap.slots[Schema.LocationSlot]

            if(locationSlot){
                if(locationSlot.value){
                    wrap.sessionAttrs[Schema.LocationSlot] = locationSlot
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
        } else if (wrap.hasSessionAttr(Schema.LocationSlot)) {
            //assuming value in session attrs, as only other way for handler to return
            let location = wrap.sessionAttrs[Schema.LocationSlot]!
            let speech: string;
            if(wrap.isIntent(Schema.YesIntent)){
                wrap.setPersistentAttr(Schema.LocationSlot, location)
                speech = `Your location is set to ${location.value}`
            } else
                speech = `Not setting your location`

            return input.responseBuilder
                .speak(speech)
                .getResponse()
        } else
            throw new Error("SetLocationHandler")
    }   
}