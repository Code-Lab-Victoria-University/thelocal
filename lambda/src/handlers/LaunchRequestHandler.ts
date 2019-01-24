import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model"

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }

    handle(handlerInput: HandlerInput): Response {        
        return handlerInput.responseBuilder
            .speak("Hi, I'm the local. I can find events around New Zealand.")
            .reprompt('I can respond to requests for locations, venues, events and help.')
            .getResponse()
    }   
}