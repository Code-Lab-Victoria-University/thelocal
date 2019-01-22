"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CancelAndStopIntentHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    }
    handle(handlerInput) {
        const speechText = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
}
exports.CancelAndStopIntentHandler = CancelAndStopIntentHandler;
//# sourceMappingURL=CancelAndStopIntentHandler.js.map