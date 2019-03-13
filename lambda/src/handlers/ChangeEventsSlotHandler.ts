import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'
import { Schema } from "../lib/Schema";
import { EventsHandler } from "./EventsHandler";

export class ChangeEventsSlotHandler implements RequestHandler {

    async canHandle(handlerInput: HandlerInput) {
        let input = await InputWrap.load(handlerInput)
        return input.isIntent(Object.values(Schema.SetIntents)) && input.session.lastSlots !== undefined
    }
    
    async handle(handlerInput: HandlerInput) {
        let input = await InputWrap.load(handlerInput)
        
        //overwrite lastSlots with new input.slots
        input.slots = Object.assign(input.session.lastSlots, input.slots)

        console.log("slots after Object.assign: " + JSON.stringify(input.slots))

        return new EventsHandler().handleWrap(input)
    }
}
