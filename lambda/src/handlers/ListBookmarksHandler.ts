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
        
        let bookmarks = input.persistent.bookmarks

        //TODO: read it out if just one
        if(bookmarks && bookmarks.length != 0){
            let bookmarksText = prettyJoin(bookmarks.map((event, i) => `for ${event.name} say option ${i+1}`), "and")

            return input.response
                .speak(`You have ${bookmarks.length} bookmarks. ${bookmarksText}`)
                .reprompt("Please choose a bookmark to read back")
                .getResponse()
        } else
            return input.response.speak("You have no bookmarks saved.")
                .reprompt("You don't have any bookmarks. Make a search or say exit.")
                .getResponse()
    }
}