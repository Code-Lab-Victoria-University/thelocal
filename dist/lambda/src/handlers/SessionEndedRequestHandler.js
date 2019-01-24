"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SessionEndedRequestHandler {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    }
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        console.log(`Session ended with reason: ${request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
}
exports.SessionEndedRequestHandler = SessionEndedRequestHandler;
//# sourceMappingURL=SessionEndedRequestHandler.js.map