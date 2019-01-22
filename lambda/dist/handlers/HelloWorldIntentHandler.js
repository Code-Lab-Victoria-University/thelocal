"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HelloWorldIntentHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
    }
    handle(handlerInput) {
        const speechText = 'Hello World!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
}
exports.HelloWorldIntentHandler = HelloWorldIntentHandler;
//# sourceMappingURL=HelloWorldIntentHandler.js.map