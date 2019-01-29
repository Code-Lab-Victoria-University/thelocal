import { HandlerInput, ErrorHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model"

export class CustomErrorHandler implements ErrorHandler {
    canHandle(): boolean {
        return true;
    }

    handle(handlerInput: HandlerInput, error: Error): Response {
        if(error){
            console.log(`Error handled: ${error.message}`);
            if(error.stack)
                console.log(error.stack)
            
            return handlerInput.responseBuilder
                .speak(`Error ${error.name} occured.`)
                .getResponse()
        } else
            return handlerInput.responseBuilder
                .speak("I didn't get that. Make sure to speak slowly and clearly")
                .reprompt("Try asking for help if you're lost")
                .getResponse();
    }   
}