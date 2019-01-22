"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HelpIntentHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    }
    handle(handlerInput) {
        const speechText = 'You can say hello to me!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
}
exports.HelpIntentHandler = HelpIntentHandler;
//# sourceMappingURL=HelpIntentHandler.js.map