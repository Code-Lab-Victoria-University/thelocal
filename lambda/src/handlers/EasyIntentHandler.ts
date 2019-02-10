import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'

interface HandleResponse {
    (handlerInput: InputWrap, input: HandlerInput): string|Response
}

export class EasyIntentHandler implements RequestHandler {
    constructor(readonly intent: string|string[], readonly handleSpeech: HandleResponse|string){}
    
    canHandle(handlerInput: HandlerInput): boolean {
        return new InputWrap(handlerInput).isIntent(this.intent)
    }
    
    handle(handlerInput: HandlerInput): Response {
        if(typeof this.handleSpeech === "string"){
            return handlerInput.responseBuilder.speak(this.handleSpeech).getResponse()
        } else {
            let response = this.handleSpeech(new InputWrap(handlerInput), handlerInput)
            if(typeof response  === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse()
            else
                return response
        }
    }
}
