import { RequestHandler, HandlerInput } from "ask-sdk-core";
import InputWrap from "../lib/InputWrap";
import { Schema } from "../lib/Schema";
import { prettyJoin } from "../lib/Util";
import { EventSelectHandler } from "./EventSelectHandler";
import * as EventUtil from '../lib/EventUtil'

export class ListBookmarksHandler implements RequestHandler {
    async canHandle(handlerInput: HandlerInput) {
        let wrap = await InputWrap.load(handlerInput)
        let backToBookmark = EventSelectHandler.isPrevIntent(wrap) && EventUtil.bookmarkMoreRecent(wrap)

        return wrap.isIntent(Schema.ListBookmarksIntent) || backToBookmark
    }
    
    async handle(handlerInput: HandlerInput) {
        let input = await InputWrap.load(handlerInput)
        
        let bookmarks = input.persistent.bookmarks

        //TODO: read it out if just one
        if(bookmarks && 0 < bookmarks.length){
            if(bookmarks.length === 1)  {
                return EventSelectHandler.getEventResponse(bookmarks[0], input)
            } else {
                let bookmarksText = prettyJoin(bookmarks.map((event, i) => `for ${event.name} say option ${i+1}`), "and")
    
                return input.response
                    .speak(`You have ${bookmarks.length} bookmarks. ${bookmarksText}`)
                    .reprompt("Please choose a bookmark to read back")
                    .getResponse()
            }
        } else
            return input.response.speak("You have no bookmarks saved.")
                .reprompt("You don't have any bookmarks. Make a search or say exit.")
                .getResponse()
    }
}