import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {Schema} from '../lib/Schema'
import { hasElements, prettyJoin } from "../lib/Util";
import * as EventUtil from '../lib/EventUtil'
import { DetailHandler } from "./DetailHandler";
import { Event } from "../lib/request";
import { Response } from "ask-sdk-model";
import AmazonSpeech from "ssml-builder/amazon_speech";
import AmazonDate from "../lib/AmazonDate";

//TODO: make go back to results work for bookmarks?
const actions = ["request the full description", "go back to the results"]

export class EventSelectHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        //handle both bookmark select and EventsHandler select
        return (wrap.isIntent(Schema.SelectIntent) && 
            (EventUtil.bookmarkMoreRecent(wrap) ? hasElements(wrap.persistent.bookmarks) : wrap.session.lastEvents !== undefined)) ||
                DetailHandler.isPrevIntent(wrap)
    }


    //TODO: add tslint to warn on non-boolean if statements to stop this happening. This was returning a promise and returning truthy
    static isPrevIntent(wrap: InputWrap){
        if(wrap.session.prevRequests === undefined)
            return false

        let prevSession = wrap.session.prevRequests[wrap.session.prevRequests.length-1]

        return wrap.isIntent(Schema.AMAZON.PreviousIntent) &&
            wrap.session.prevRequests !== undefined && 
            (prevSession === Schema.SelectIntent || (prevSession === Schema.AMAZON.PreviousIntent && wrap.session.prevRequests.includes(Schema.SelectIntent)))
    }

    static getEventDetails(event: Event, speech?: AmazonSpeech) {
        speech = speech || new AmazonSpeech()
    
        speech.say(event.name)
            .say("is at").say(event.location.name)
            // .say("on").say(event.datetime_summary.replace("-", "to"))
        new AmazonDate(event.datetime_start, event.datetime_end).toSpeech(speech, true)
    
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

        //TODO: use event phone
        if(event.location.booking_phone)
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
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        let event = DetailHandler.isPrevIntent(wrap) ? wrap.session.selectedEvent :
                    EventUtil.getEvent(
                        EventUtil.bookmarkMoreRecent(wrap) ? wrap.persistent.bookmarks : wrap.session.lastEvents, 
                        wrap.slots)

        if(event){
            return EventSelectHandler.getInteractiveResponse(event, wrap)
        } else {
            let reprompt = "please say another number or go back to the results."
            return input.responseBuilder
                .speak(`I couldn't find that event, ${reprompt}`)
                .reprompt(reprompt)
                .getResponse()
        }
    }
}