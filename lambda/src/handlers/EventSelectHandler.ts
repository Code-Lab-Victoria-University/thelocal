import { Response } from "ask-sdk-model";
import AmazonSpeech from "ssml-builder/amazon_speech";
import { DateRange } from "../lib/DateRange";
import * as EventUtil from '../lib/EventUtil';
import InputWrap from "../lib/InputWrap";
import { Event } from "../lib/request";
import { Schema } from '../lib/Schema';
import { hasElements, prettyJoin } from "../lib/Util";
import { AutoNavigationHandler } from "./NavigationHandler";

//TODO: make go back to results work for bookmarks?
const actions = ["request the full description", "go back to the list of events"]

export class EventSelectHandler extends AutoNavigationHandler {
    intent = Schema.SelectIntent

    canWrap(wrap: InputWrap) {
        //handle both bookmark select and EventsHandler select
        return (EventUtil.bookmarkMoreRecent(wrap) ? 
            hasElements(wrap.persistent.bookmarks) : wrap.session.lastEventsRequest !== undefined) ||
            wrap.session.selectedEvent !== undefined
    }

    static getEventDetails(event: Event, speech?: AmazonSpeech) {
        speech = speech || new AmazonSpeech()
    
        speech.say(event.name)
            .say("is at").say(event.location.name)
            // .say("on").say(event.datetime_summary.replace("-", "to"))
        new DateRange(event).toSpeech(speech)
    
        let shortenedDesc = event.description.split(".").reduce((prev, cur) => {
            let newLength = prev.length+cur.length
            if(150 < newLength)
                return prev
            else
                return prev+cur
        })
        return speech.sentence(shortenedDesc)
    }

    static getInteractiveResponse(event: Event, wrap: InputWrap): Response {
        let alreadyBookmarked = wrap.persistent.bookmarks !== undefined && 
            wrap.persistent.bookmarks.some(bookmark => bookmark.id === event.id)

        let curActions = actions.slice()

        if(EventUtil.getPhone(event))
            curActions.push("request the booking phone number")
        if(!alreadyBookmarked)
            curActions.unshift("save this event to your bookmarks")

        let actionsText = "You can " + prettyJoin(curActions, "or")
        let speech = EventSelectHandler.getEventDetails(event)
        speech.pauseByStrength("x-strong")
        speech.say(actionsText)
        // speech.sentence("Goodbye")

        wrap.session.selectedEvent = event
        
        return wrap.response
            .speak(speech.ssml())
            .reprompt(actionsText)
            .getResponse()
    }
    
    async handleWrap(wrap: InputWrap) {
        //getEvent will be false if incorrect slots. Else use selectedEvent.
        let event = EventUtil.getEvent(EventUtil.bookmarkMoreRecent(wrap) ? wrap.persistent.bookmarks : wrap.session.lastEventsRequest, 
                        wrap.slots) || wrap.session.selectedEvent

        if(event){
            return EventSelectHandler.getInteractiveResponse(event, wrap)
        } else {
            let reprompt = "Please say another number or go back to the results."
            return wrap.response
                .speak(`I couldn't find that event, ${reprompt}`)
                .reprompt(reprompt)
                .getResponse()
        }
    }
}