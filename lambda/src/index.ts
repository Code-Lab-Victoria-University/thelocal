import { SkillBuilders } from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { CustomErrorHandler } from "./handlers/CustomErrorHandler";

import {EasyIntentHandler} from './handlers/EasyIntentHandler'
import {EventsHandler} from './handlers/EventsHandler'

import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';

import InputWrap from "./lib/InputWrap";
import { EventSelectHandler } from "./handlers/EventSelectHandler";
import { rand } from "./lib/Util";
import { ChangeEventsSlotHandler } from "./handlers/ChangeEventsSlotHandler";
import { Schema } from "./lib/Schema";
import { TutorialHandler } from "./handlers/TutorialHandler";

const Persistence = new DynamoDbPersistenceAdapter({
    tableName: "thelocal"
})

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestInterceptors(async input => {
        let wrap = await InputWrap.load(input)
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
        //tutorial always at start (overrides launch request)
        new TutorialHandler(),

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

        new SessionEndedRequestHandler(),

        //handle all
        {
            canHandle: () => true,
            handle: input => input.responseBuilder
                .speak("I couldn't understand what you said. Please speak clearly.")
                .getResponse()
        }
        )

    .addErrorHandlers(new CustomErrorHandler)
    .withPersistenceAdapter(Persistence)

    .addResponseInterceptors(async (input, response) => {
        //save, etc
        (await InputWrap.load(input)).endRequest()
            
        if(response)
            console.log("OUTPUT: " + JSON.stringify(response.outputSpeech))
        else
            console.log("NO RESPONSE")
    })
    .lambda();