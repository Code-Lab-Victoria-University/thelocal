"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ask_sdk_core_1 = require("ask-sdk-core");
const LaunchRequestHandler_1 = require("./handlers/LaunchRequestHandler");
const SessionEndedRequestHandler_1 = require("./handlers/SessionEndedRequestHandler");
const CustomErrorHandler_1 = require("./handlers/CustomErrorHandler");
const SetLocationHandler_1 = require("./handlers/SetLocationHandler");
const IntentHandler_1 = require("./handlers/IntentHandler");
const EventsHandler_1 = require("./handlers/EventsHandler");
const ask_sdk_dynamodb_persistence_adapter_1 = require("ask-sdk-dynamodb-persistence-adapter");
const InputWrap_1 = __importDefault(require("./lib/InputWrap"));
const Persistence = new ask_sdk_dynamodb_persistence_adapter_1.DynamoDbPersistenceAdapter({
    tableName: "thelocal"
});
const skillBuilder = ask_sdk_core_1.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestInterceptors(input => {
    let wrap = new InputWrap_1.default(input);
    let output = "";
    if (wrap.intent) {
        output += `INTENT: ${wrap.intent.name}\n`;
        output += JSON.stringify(wrap);
        // if(wrap.intent.slots){
        //     for( let slot of Object.values(wrap.intent.slots)){
        //         // output += `${slot.name}: ${slot.spoken}\n`
        //         output += JSON.stringify(slot)
        //     }
        // }
    }
    if (output)
        console.log(output);
})
    .addRequestHandlers(new LaunchRequestHandler_1.LaunchRequestHandler(), new SetLocationHandler_1.SetLocationHandler(), new EventsHandler_1.EventsHandler(), new IntentHandler_1.IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'), new IntentHandler_1.IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'), new SessionEndedRequestHandler_1.SessionEndedRequestHandler())
    .addErrorHandlers(new CustomErrorHandler_1.CustomErrorHandler)
    .withPersistenceAdapter(Persistence)
    .addResponseInterceptors((input, response) => {
    if (response)
        console.log("OUTPUT: " + JSON.stringify(response.outputSpeech));
    else
        console.log("NO RESPONSE");
})
    .lambda();
//# sourceMappingURL=index.js.map