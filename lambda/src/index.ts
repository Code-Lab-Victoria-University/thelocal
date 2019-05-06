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
import { ui } from "ask-sdk-model";
import { BookmarkEventHandler } from "./handlers/BookmarkEventHandler";
import { ListBookmarksHandler } from "./handlers/ListBookmarksHandler";
import { DetailHandler } from "./handlers/DetailHandler";

const Persistence = new DynamoDbPersistenceAdapter({
    tableName: "thelocal"
})

const skillBuilder = SkillBuilders.custom();

function speechString(speech: ui.OutputSpeech) {
    if(speech.type == "SSML")
        return speech.ssml
    else
        return speech.text
}

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
        } else
            output += "REQUEST_TYPE: " + input.requestEnvelope.request.type

        if(output)
            console.log(output)
    })

    .addRequestHandlers(
        //always allow reset
        new EasyIntentHandler(Schema.RESET, (wrap, input) => {
            input.attributesManager.setPersistentAttributes({})
            return "Successful reset"
        }),

        //TODO: use EXIT if blind foundation lets you EXIT to exit the skill as well

        //tutorial always at start (overrides launch request)
        new TutorialHandler(),

        new LaunchRequestHandler(),

        //could make this dependant on where you are in the skill
        new EasyIntentHandler(Schema.AMAZON.HelpIntent, 
            "I will respond to your questions to find events near you. Say start the tutorial to listen to the tutorial again."),

        new EasyIntentHandler([Schema.AMAZON.CancelIntent, Schema.AMAZON.StopIntent], 
            rand('Bye', "Goodbye", "Thanks for chatting", "See you next time", "Seeya")),

        //most specific handlers first
        new DetailHandler(),
        new BookmarkEventHandler(),

        //these can be at end
        new ListBookmarksHandler(),
        new EventSelectHandler(),

        //will override EventsHandler if SetIntent and no prev req
        new ChangeEventsSlotHandler(),
        //most general last
        new EventsHandler(),

        new SessionEndedRequestHandler(),

        //handle all
        {
            canHandle: () => true,
            handle: input => input.responseBuilder
                .speak("I couldn't understand what you said. Please speak clearly.")
                .getResponse()
        }
        )

    .addErrorHandlers(new CustomErrorHandler())
    .withPersistenceAdapter(Persistence)

    .addResponseInterceptors(async (input, response) => {
        //save metadata for consequtive requests
        (await InputWrap.load(input)).endRequest()
            
        if(response && response.outputSpeech){
            console.log("OUTPUT: " + speechString(response.outputSpeech))
            if(response.reprompt)
                console.log("REPROMPT: " + speechString(response.reprompt.outputSpeech))
        }
        else
            console.log("NO RESPONSE")
    })
    .lambda();