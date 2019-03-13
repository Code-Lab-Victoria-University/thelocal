import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";


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
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        let numSlot = wrap.slots[Schema.NumberSlot]

        if(numSlot){
            let events = wrap.session.lastEvents!
            let number = Number.parseInt(numSlot.value)

            if(number <= events.list.length){
                let event = events.list[number-1]
                
                let speech = EventSelectHandler.getSpeech(event)
                speech.sentence("Goodbye")
                
                return input.responseBuilder.speak(speech.ssml()).getResponse()
            } else
                return input.responseBuilder
                    .speak(`Option ${number} is not one of the provided ${events.list.length} events`)
                    .getResponse()
        } else 
            throw new Error("EventSelectHandler error: "+ JSON.stringify(wrap))
    }
}