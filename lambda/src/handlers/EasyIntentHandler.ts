import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { NodeStringDecoder } from "string_decoder";
import InputWrap from '../lib/InputWrap'

interface HandleResponse {
    (handlerInput: InputWrap, input: HandlerInput): string|Response
}

export class EasyIntentHandler implements RequestHandler {
    constructor(readonly intent: string|string[], readonly handleSpeech: HandleResponse|string){}
    
    async canHandle(handlerInput: HandlerInput) {
        return (await InputWrap.load(handlerInput)).isIntent(this.intent)
    }
    
    async handle(handlerInput: HandlerInput) {
        if(typeof this.handleSpeech === "string"){
            return handlerInput.responseBuilder.speak(this.handleSpeech).getResponse()
        } else {
            let response = this.handleSpeech(await InputWrap.load(handlerInput), handlerInput)
            if(typeof response  === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse()
            else
                return response
        }
    }
}