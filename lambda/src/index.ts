import { SkillBuilders } from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { CustomErrorHandler } from "./handlers/CustomErrorHandler";
import {SetLocationHandler} from "./handlers/SetLocationHandler"

import {IntentHandler} from './handlers/IntentHandler'
import {EventsHandler} from './handlers/EventsHandler'

import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';

import {getEvents} from './lib/request'
import InputWrap from "./lib/InputWrap";

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
        new SetLocationHandler(),
        new EventsHandler(),
        new IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'),
        new IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'),
        new SessionEndedRequestHandler()
        )

    .addErrorHandlers(new CustomErrorHandler)
    .withPersistenceAdapter(Persistence)

    .addResponseInterceptors((input, response) => {
        if(response)
            console.log("OUTPUT: " + JSON.stringify(response.outputSpeech))
        else
            console.log("NO RESPONSE")
    })
    .lambda();