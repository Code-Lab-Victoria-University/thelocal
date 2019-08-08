import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap from '../lib/InputWrap';

interface HandleResponse {
    (input: InputWrap): string|Response|Promise<string>|Promise<Response>
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
            let response = await this.handleSpeech(await InputWrap.load(handlerInput))

            if(typeof response  === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse()
            else
                return response

        }

    }
}
