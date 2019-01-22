import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model"

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }

    handle(handlerInput: HandlerInput): Response {
        const speechText = 'Welcome to the local. I can help you find events in New Zealand.';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse()
    }   
}