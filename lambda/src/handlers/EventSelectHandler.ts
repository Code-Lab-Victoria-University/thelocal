import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";


export class EventSelectHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input)
        return wrap.isIntent(Schema.SelectIntent) && wrap.sessionAttrs.lastEvents !== undefined
    }
    
    handle(input: HandlerInput) {
        let wrap = new InputWrap(input)
        let numSlot = wrap.slots[Schema.NumberSlot]

        if(numSlot){
            let events = wrap.sessionAttrs.lastEvents!
            let number = Number.parseInt(numSlot.value)

            if(number <= events.list.length){
                let event = events.list[number-1]
                let speech = new AmazonSpeech()

                speech.say(event.name)
                    .say("is at").say(event.location.name)
                    // .say("on").say(event.datetime_summary.replace("-", "to"))
                new AmazonDate(event.datetime_start).toSpeech(speech)
                speech.sentence(event.description)
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