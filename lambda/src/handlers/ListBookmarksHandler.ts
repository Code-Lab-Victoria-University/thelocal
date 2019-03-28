import { RequestHandler, HandlerInput } from "ask-sdk-core";
import InputWrap from "../lib/InputWrap";
import { Schema } from "../lib/Schema";
import { prettyJoin } from "../lib/Util";

export class ListBookmarksHandler implements RequestHandler {
    async canHandle(handlerInput: HandlerInput) {
        return (await InputWrap.load(handlerInput)).isIntent(Schema.ListBookmarksIntent)
    }
    
    async handle(handlerInput: HandlerInput) {
        let input = await InputWrap.load(handlerInput)
        
        let events = input.persistent.bookmarks

        if(events && events.length != 0){
            return input.response
                .speak("Your saved bookmarks include " + prettyJoin(events.map(event => event.name), "and"))
                .getResponse()
        } else
            return input.response.speak("You have no bookmarks saved.").getResponse()
    }
}