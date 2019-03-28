import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";

let eventActionsText = "You can save this event, go back to the results, select a different number"

export class EventSelectHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        return wrap.isIntent(Schema.SelectIntent) && wrap.session.lastEvents !== undefined
    }

    static getSpeech(event: Event, speech?: AmazonSpeech) {
        speech = speech || new AmazonSpeech()

        speech.say(event.name)
            .say("is at").say(event.location.name)
            // .say("on").say(event.datetime_summary.replace("-", "to"))
        new AmazonDate(event.datetime_start).toSpeech(speech, true)
        return speech.sentence(event.description)
    }

    static getEvent(events?: Response<Event>, slots?: Slots): Event|undefined {
        if(events && slots){
            let numSlot = slots[Schema.NumberSlot]
            if(numSlot){
                let number = Number.parseInt(numSlot.value)
    
                if(number <= events.list.length)
                    return events.list[number-1]
            }
        }

        return undefined
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        
        let event = EventSelectHandler.getEvent(wrap.session.lastEvents, wrap.slots)

        if(event){
            let speech = EventSelectHandler.getSpeech(event)
            speech.pauseByStrength("x-strong")
            speech.say(eventActionsText)
            // speech.sentence("Goodbye")
            
            return input.responseBuilder
                .speak(speech.ssml())
                .reprompt(eventActionsText)
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