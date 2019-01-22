"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ask_sdk_core_1 = require("ask-sdk-core");
const LaunchRequestHandler_1 = require("./handlers/LaunchRequestHandler");
const HelloWorldIntentHandler_1 = require("./handlers/HelloWorldIntentHandler");
const HelpIntentHandler_1 = require("./handlers/HelpIntentHandler");
const CancelAndStopIntentHandler_1 = require("./handlers/CancelAndStopIntentHandler");
const SessionEndedRequestHandler_1 = require("./handlers/SessionEndedRequestHandler");
const CustomErrorHandler_1 = require("./handlers/CustomErrorHandler");
const skillBuilder = ask_sdk_core_1.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(new LaunchRequestHandler_1.LaunchRequestHandler(), new HelloWorldIntentHandler_1.HelloWorldIntentHandler(), new HelpIntentHandler_1.HelpIntentHandler(), new CancelAndStopIntentHandler_1.CancelAndStopIntentHandler(), new SessionEndedRequestHandler_1.SessionEndedRequestHandler())
    .addErrorHandlers(new CustomErrorHandler_1.CustomErrorHandler)
    .lambda();
//# sourceMappingURL=index.js.map