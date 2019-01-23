import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'

interface HandleResponse {
    (handlerInput: InputWrap): string|Response
}

export class IntentHandler implements RequestHandler {
    constructor(readonly intent: string|string[], readonly handleSpeech: HandleResponse|string){}
    
    canHandle(handlerInput: HandlerInput): boolean {
        if(handlerInput.requestEnvelope.request.type === 'IntentRequest'){
            let handlingIntent = handlerInput.requestEnvelope.request.intent.name
            if(typeof this.intent === 'string')
                return handlingIntent == this.intent
            else
                return this.intent.includes(handlingIntent)
        } else
            return false
    }
    
    handle(handlerInput: HandlerInput): Response {
        if(typeof this.handleSpeech === "string"){
            return handlerInput.responseBuilder.speak(this.handleSpeech).getResponse()
        } else {
            let response = this.handleSpeech(new InputWrap(handlerInput))
            if(typeof response  === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse()
            else
                return response
        }
    }
}
