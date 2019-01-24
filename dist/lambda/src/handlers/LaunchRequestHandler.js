"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LaunchRequestHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak("Hi, I'm the local. I can find events around New Zealand.")
            .reprompt('I can respond to requests for locations, venues, events and help.')
            .getResponse();
    }
}
exports.LaunchRequestHandler = LaunchRequestHandler;
//# sourceMappingURL=LaunchRequestHandler.js.map