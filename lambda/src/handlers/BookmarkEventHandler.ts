import AmazonSpeech from "ssml-builder/amazon_speech";
import InputWrap from '../lib/InputWrap';
import { Schema } from "../lib/Schema";
import { AutoNavigationHandler } from "./NavigationHandler";

export class BookmarkEventHandler extends AutoNavigationHandler {
    intent = Schema.BookmarkEventIntent
    
    handleWrap(input: InputWrap) {
        let event = input.session.selectedEvent

        let speech = new AmazonSpeech()
        let reprompt = "You can go back to the event info or make a new search"

        if(event){
            if(!input.persistent.bookmarks)
                input.persistent.bookmarks = []

            input.persistent.bookmarks.push(event)

            //TODO: auto delete
            speech.say("Saving")
                .say(event.name)
                .say("to your bookmarked events.")
                .pauseByStrength("x-strong")
                .say("View these at any time by asking me for your bookmarks. You can go back to the event info or make a new search")
        } else {
            speech
                .say("You tried to bookmark an event. You must find an event to save before you do this.")
        }

        return input.response
            .speak(speech.ssml())
            .reprompt(reprompt)
            .getResponse()
    }
}
