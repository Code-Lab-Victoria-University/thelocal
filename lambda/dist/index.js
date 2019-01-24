"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ask_sdk_core_1 = require("ask-sdk-core");
const LaunchRequestHandler_1 = require("./handlers/LaunchRequestHandler");
const SessionEndedRequestHandler_1 = require("./handlers/SessionEndedRequestHandler");
const CustomErrorHandler_1 = require("./handlers/CustomErrorHandler");
const SetLocationHandler_1 = require("./handlers/SetLocationHandler");
const IntentHandler_1 = require("./handlers/IntentHandler");
const VenueHandler_1 = require("./handlers/VenueHandler");
const ask_sdk_dynamodb_persistence_adapter_1 = require("ask-sdk-dynamodb-persistence-adapter");
const Persistence = new ask_sdk_dynamodb_persistence_adapter_1.DynamoDbPersistenceAdapter({
    tableName: "thelocal"
});
const skillBuilder = ask_sdk_core_1.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(new LaunchRequestHandler_1.LaunchRequestHandler(), new SetLocationHandler_1.SetLocationHandler(), new VenueHandler_1.VenueHandler(), new IntentHandler_1.IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'), new IntentHandler_1.IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'), new SessionEndedRequestHandler_1.SessionEndedRequestHandler())
    .addErrorHandlers(new CustomErrorHandler_1.CustomErrorHandler)
    .withPersistenceAdapter(Persistence)
    .lambda();
//# sourceMappingURL=index.js.map