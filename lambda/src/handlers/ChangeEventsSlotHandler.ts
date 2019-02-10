import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'
import { Schema } from "../lib/Schema";
import { EventsHandler } from "./EventsHandler";

export class ChangeEventsSlotHandler implements RequestHandler {

    canHandle(handlerInput: HandlerInput): boolean {
        let input = new InputWrap(handlerInput)
        return input.isIntent(Object.values(Schema.SetIntents)) && input.sessionAttrs.lastSlots !== undefined
    }
    
    handle(handlerInput: HandlerInput): Promise<Response> {
        let input = new InputWrap(handlerInput)
        
        //overwrite lastSlots with new input.slots
        input.slots = Object.assign(input.sessionAttrs.lastSlots, input.slots)

        console.log("slots after Object.assign: " + JSON.stringify(input.slots))

        return new EventsHandler().handleWrap(input)
    }
}
