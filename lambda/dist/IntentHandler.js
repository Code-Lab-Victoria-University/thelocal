"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IntentHandler {
    constructor(intent, handleSpeech) {
        this.intent = intent;
        this.handleSpeech = handleSpeech;
    }
    canHandle(handlerInput) {
        if (handlerInput.requestEnvelope.request.type === 'IntentRequest') {
            let handlingIntent = handlerInput.requestEnvelope.request.intent.name;
            if (typeof this.intent === 'string')
                return handlingIntent == this.intent;
            else
                return this.intent.includes(handlingIntent);
        }
    }
    handle(handlerInput) {
        if (typeof this.handleSpeech === "string") {
            return handlerInput.responseBuilder.speak(this.handleSpeech).getResponse();
        }
        else {
            let response = this.handleSpeech(handlerInput.requestEnvelope.request, handlerInput);
            if (typeof response === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse();
            else
                return response;
        }
    }
}
exports.IntentHandler = IntentHandler;
//# sourceMappingURL=IntentHandler.js.map