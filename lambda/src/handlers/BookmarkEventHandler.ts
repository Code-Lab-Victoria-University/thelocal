import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'
import { Schema } from "../lib/Schema";
import { EventSelectHandler } from "./EventSelectHandler";
import AmazonSpeech from "ssml-builder/amazon_speech";
import * as EventUtil from '../lib/EventUtil'

export class BookmarkEventHandler implements RequestHandler {    
    async canHandle(handlerInput: HandlerInput) {
        return (await InputWrap.load(handlerInput)).isIntent(Schema.BookmarkEventIntent)
    }
    
    async handle(handlerInput: HandlerInput) {
        let input = await InputWrap.load(handlerInput)

        let event = EventUtil.getEvent(input.session.lastEvents, input.session.lastSlots)

        let speech = new AmazonSpeech()
        let reprompt = "Some things you could do now include listing your existing bookmarks and making a new search"

        if(event){
            if(!input.persistent.bookmarks)
                input.persistent.bookmarks = []

            input.persistent.bookmarks.push(event)

            //TODO: auto delete
            speech.say("Saving")
                .say(event.name)
                .say("to your bookmarked events.")
                .pauseByStrength("x-strong")
                .say("View these at any time by asking me for your bookmarks")
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
