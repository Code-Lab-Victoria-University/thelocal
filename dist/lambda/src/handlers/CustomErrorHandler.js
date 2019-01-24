"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CustomErrorHandler {
    canHandle() {
        return true;
    }
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        return handlerInput.responseBuilder
            .speak("I didn't get that. Make sure to speak slowly and clearly")
            .reprompt("Try asking for help if you're lost")
            .getResponse();
    }
}
exports.CustomErrorHandler = CustomErrorHandler;
//# sourceMappingURL=CustomErrorHandler.js.map