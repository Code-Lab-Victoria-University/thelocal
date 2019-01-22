"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CustomErrorHandler {
    canHandle() {
        return true;
    }
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    }
}
exports.CustomErrorHandler = CustomErrorHandler;
//# sourceMappingURL=CustomErrorHandler.js.map