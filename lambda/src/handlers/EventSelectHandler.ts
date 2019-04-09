import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";
import { hasElements, prettyJoin } from "../lib/Util";

let actions = ["go back to the results", "select a different number"]
let bookmarkActions = ["save this event to your bookmarks"]

export class EventSelectHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        return wrap.isIntent(Schema.SelectIntent) && 
            EventSelectHandler.bookmarkMoreRecent(wrap) ? hasElements(wrap.persistent.bookmarks) : wrap.session.lastEvents !== undefined
    }

    //TODO: use list of lastRequests, and most recent one will be which path we go down in bookmark vs request list

    static bookmarkMoreRecent(wrap: InputWrap){
        return wrap.session.prevRequests !== undefined &&
            wrap.session.prevRequests.indexOf(Schema.EventsIntent) < 
            wrap.session.prevRequests.indexOf(Schema.ListBookmarksIntent)
    }

    static getSpeech(event: Event, speech?: AmazonSpeech) {
        speech = speech || new AmazonSpeech()

        speech.say(event.name)
            .say("is at").say(event.location.name)
            // .say("on").say(event.datetime_summary.replace("-", "to"))
        new AmazonDate(event.datetime_start).toSpeech(speech, true)
        return speech.sentence(event.description)
    }

    static getEvent(eventsOrResponse?: Event[]|Response<Event>, slots?: Slots): Event|undefined {
        let events;

        if(eventsOrResponse instanceof Array)
            events = eventsOrResponse
        else if(eventsOrResponse)
            events = eventsOrResponse.list

        if(events && slots){
            let numSlot = slots[Schema.NumberSlot]
            if(numSlot){
                let number = Number.parseInt(numSlot.value)
                if(number <= events.length)
                    return events[number-1]
            }
        }

        return undefined
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        let isBookmarks = EventSelectHandler.bookmarkMoreRecent(wrap)
        let events = isBookmarks ? wrap.persistent.bookmarks : wrap.session.lastEvents
        let event = EventSelectHandler.getEvent(events, wrap.slots)

        if(event){
            let curActions = isBookmarks ? actions : bookmarkActions.concat(...actions)
            let actionsText = "You can " + prettyJoin(curActions, "or")
            let speech = EventSelectHandler.getSpeech(event)
            speech.pauseByStrength("x-strong")
            speech.say(actionsText)
            // speech.sentence("Goodbye")
            
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