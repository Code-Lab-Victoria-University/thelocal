"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LaunchRequestHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }
    handle(handlerInput) {
        const speechText = 'Welcome to the local. I can help you find events in New Zealand.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}
exports.LaunchRequestHandler = LaunchRequestHandler;
//# sourceMappingURL=LaunchRequestHandler.js.map