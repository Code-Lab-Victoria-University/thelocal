import AmazonSpeech from "ssml-builder/amazon_speech";
import { getPhone } from "../lib/EventUtil";
import InputWrap from "../lib/InputWrap";
import { Schema } from '../lib/Schema';
import { AutoNavigationHandler } from "./NavigationHandler";

export class DetailHandler extends AutoNavigationHandler {
    intent = Object.values(Schema.DetailIntents)

    canWrap(input: InputWrap) {
        return input.session.selectedEvent !== undefined
    }
    
    handleWrap(wrap: InputWrap) {
        //can assume true due to handler
        let event = wrap.session.selectedEvent!
        let reprompt = "You can go back to the event info or make a new search"

        let phone = getPhone(event)
        if(wrap.isIntent(Schema.DetailIntents.Phone) && phone){
            let speech = new AmazonSpeech()
                .say("The phone number is")
                .sayAs({
                    interpret: "telephone",
                    word: phone
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