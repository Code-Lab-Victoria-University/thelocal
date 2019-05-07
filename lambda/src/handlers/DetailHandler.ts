import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {Schema} from '../lib/Schema'
import AmazonSpeech from "ssml-builder/amazon_speech";
import { AutoNavigationHandler } from "./NavigationHandler";

export class DetailHandler extends AutoNavigationHandler {
    intent = Object.values(Schema.DetailIntents)

    canWrap(input: InputWrap) {
        return input.session.selectedEvent !== undefined
    }
    
    async handleWrap(wrap: InputWrap) {
        //can assume true due to handler
        let event = wrap.session.selectedEvent!
        let reprompt = "You can go back to the event info or make a new search"

        if(wrap.isIntent(Schema.DetailIntents.Phone) && event.location.booking_phone){
            let speech = new AmazonSpeech()
                .say("The phone number is")
                .sayAs({
                    interpret: "telephone",
                    word: event.location.booking_phone
                })
                .sentence(reprompt)

            return wrap.response.speak(speech.ssml())
                .reprompt(reprompt)
                .getResponse()
        } else if(wrap.isIntent(Schema.DetailIntents.Description)){
            let speech = new AmazonSpeech()
                .say(event.description)
                .sentence(reprompt)

            return wrap.response.speak(speech.ssml())
                .reprompt(reprompt)
                .getResponse()
        }
        else
            throw new Error("Unhandled Detail Request")
    }
}