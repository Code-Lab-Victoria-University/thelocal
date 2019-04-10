import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {Schema} from '../lib/Schema'
import { hasElements, prettyJoin } from "../lib/Util";
import * as EventUtil from '../lib/EventUtil'

//TODO: make go back to results work for bookmarks?
const actions = ["go back to the results", "select a different number"]

export class EventSelectHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        //handle both bookmark select and EventsHandler select
        return wrap.isIntent(Schema.SelectIntent) && 
            EventUtil.bookmarkMoreRecent(wrap) ? hasElements(wrap.persistent.bookmarks) : wrap.session.lastEvents !== undefined
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        let isBookmarks = EventUtil.bookmarkMoreRecent(wrap)
        let events = isBookmarks ? wrap.persistent.bookmarks : wrap.session.lastEvents
        let event = EventUtil.getEvent(events, wrap.slots)

        if(event){
            let curActions = actions.slice()

            if(event.location.booking_phone)
                curActions.push("request the booking phone number")
            if(!isBookmarks)
                curActions.unshift("save this event to your bookmarks")

            let actionsText = "You can " + prettyJoin(curActions, "or")
            let speech = EventUtil.getSpeech(event)
            speech.pauseByStrength("x-strong")
            speech.say(actionsText)
            // speech.sentence("Goodbye")

            wrap.session.selectedEvent = event
            
            return input.responseBuilder
                .speak(speech.ssml())
                .reprompt(actionsText)
                .getResponse()
        } else {
            let reprompt = "please say another number or go back to the results."
            return input.responseBuilder
                .speak(`I couldn't find that event, ${reprompt}`)
                .reprompt(reprompt)
                .getResponse()
        }
    }
}