import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {Schema} from '../lib/Schema'
import AmazonSpeech from "ssml-builder/amazon_speech";

export class DetailHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        return wrap.isIntent(Object.values(Schema.DetailIntents)) && wrap.session.selectedEvent !== undefined
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        //can assume true due to handler
        let event = wrap.session.selectedEvent!

        if(wrap.isIntent(Schema.DetailIntents.Phone) && event.location.booking_phone){
            let reprompt = "From here you could go back to the event info, ask for different details or exit"
            let speech = new AmazonSpeech()
                .say("The phone number is")
                .sayAs({
                    interpret: "telephone",
                    word: event.location.booking_phone
                })
                .sentence(reprompt)

            return input.responseBuilder.speak(speech.ssml())
                .reprompt(reprompt)
                .getResponse()
        } else
            throw new Error("Unhandled Detail Request")
    }
}