import { SkillBuilders } from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { CustomErrorHandler } from "./handlers/CustomErrorHandler";
// import {SetLocationHandler} from "./handlers/SetLocationHandler"

import {EasyIntentHandler} from './handlers/EasyIntentHandler'
import {EventsHandler} from './handlers/EventsHandler'

import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';

import {getEvents} from './lib/request'
import InputWrap from "./lib/InputWrap";
import { EventSelectHandler } from "./handlers/EventSelectHandler";
import { rand } from "./lib/Util";
import { ChangeEventsSlotHandler } from "./handlers/ChangeEventsSlotHandler";
import { Schema } from "./lib/Schema";

const Persistence = new DynamoDbPersistenceAdapter({
    tableName: "thelocal"
})

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestInterceptors(input => {
        let wrap = new InputWrap(input)
        let output = ""
        if(wrap.intent){
            output += `INTENT: ${wrap.intent.name}\n`
            output += JSON.stringify(wrap)
            // if(wrap.intent.slots){
            //     for( let slot of Object.values(wrap.intent.slots)){
            //         // output += `${slot.name}: ${slot.spoken}\n`
            //         output += JSON.stringify(slot)
            //     }
            // }
        }

        if(output)
            console.log(output)
    })

    .addRequestHandlers(
        new LaunchRequestHandler(),

        new EasyIntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'),
        new EasyIntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 
            rand('Bye', "Goodbye")),

        new EasyIntentHandler(Schema.RESET, (wrap, input) => {
            input.attributesManager.setPersistentAttributes({})
            return "Successful reset"
        }),

        // new SetLocationHandler(),
        new ChangeEventsSlotHandler(),
        new EventsHandler(),
        new EventSelectHandler(),

        new SessionEndedRequestHandler()
        )

    .addErrorHandlers(new CustomErrorHandler)
    .withPersistenceAdapter(Persistence)

    .addResponseInterceptors((input, response) => {
        //save, etc
        new InputWrap(input).endRequest()
            
        if(response)
            console.log("OUTPUT: " + JSON.stringify(response.outputSpeech))
        else
            console.log("NO RESPONSE")
    })
    .lambda();