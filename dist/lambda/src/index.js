"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ask_sdk_core_1 = require("ask-sdk-core");
const LaunchRequestHandler_1 = require("./handlers/LaunchRequestHandler");
const SessionEndedRequestHandler_1 = require("./handlers/SessionEndedRequestHandler");
const CustomErrorHandler_1 = require("./handlers/CustomErrorHandler");
const SetLocationHandler_1 = require("./handlers/SetLocationHandler");
const IntentHandler_1 = require("./handlers/IntentHandler");
const ask_sdk_dynamodb_persistence_adapter_1 = require("ask-sdk-dynamodb-persistence-adapter");
const request_1 = require("./lib/request");
(() => __awaiter(this, void 0, void 0, function* () {
    console.log(yield request_1.getEvents({
        location_slug: "valhalla-wellington"
    }));
}))();
const Persistence = new ask_sdk_dynamodb_persistence_adapter_1.DynamoDbPersistenceAdapter({
    tableName: "thelocal"
});
const skillBuilder = ask_sdk_core_1.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(new LaunchRequestHandler_1.LaunchRequestHandler(), new SetLocationHandler_1.SetLocationHandler(), new IntentHandler_1.IntentHandler("VenueIntent", input => {
    if (input.slots)
        return "You said" + input.slots["Venue"].value;
    else
        return "No venue supplied";
}), new IntentHandler_1.IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'), new IntentHandler_1.IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'), new SessionEndedRequestHandler_1.SessionEndedRequestHandler())
    .addErrorHandlers(new CustomErrorHandler_1.CustomErrorHandler)
    .withPersistenceAdapter(Persistence)
    .lambda();
//# sourceMappingURL=index.js.map