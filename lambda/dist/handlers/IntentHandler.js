"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InputWrap_1 = __importDefault(require("../lib/InputWrap"));
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
        else
            return false;
    }
    handle(handlerInput) {
        if (typeof this.handleSpeech === "string") {
            return handlerInput.responseBuilder.speak(this.handleSpeech).getResponse();
        }
        else {
            let response = this.handleSpeech(new InputWrap_1.default(handlerInput));
            if (typeof response === 'string')
                return handlerInput.responseBuilder.speak(response).getResponse();
            else
                return response;
        }
    }
}
exports.IntentHandler = IntentHandler;
//# sourceMappingURL=IntentHandler.js.map