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
        new EasyIntentHandler(Schema.RESET, input => {
            input.persistent = {}
            return "Successful reset"
        }),

        //TODO: use EXIT if blind foundation lets you EXIT to exit the skill as well

        //tutorial always at start (overrides launch request)
        new EasyIntentHandler(Schema.SKIPTUTORIAL, input => {
            input.persistent.finishedTutorial = true;
            return "Tutorial skipped"
        }),

        new TutorialHandler(),

        new LaunchRequestHandler(),

        //could make this dependant on where you are in the skill
        new EasyIntentHandler(Schema.AMAZON.HelpIntent, 
            "I will respond to your questions to help find events happening near you. Say start the tutorial to listen to the tutorial again."),

        new EasyIntentHandler([Schema.AMAZON.CancelIntent, Schema.AMAZON.StopIntent], 
            rand('Bye', "Goodbye", "Thanks for chatting", "See you next time", "Seeya")),

        //I don't think the order here matters now that NavigationHandler is implemented

        //most specific handlers first
        new DetailHandler(),
        new BookmarkEventHandler(),

        //choosing a specific event
        new EventSelectHandler(),

        new ListBookmarksHandler(),
        
        //most general entry last
        new EventsHandler(),

        new SessionEndedRequestHandler(),

        //handle all
        {
            //TODO: give the user a yes/no way to exit here
            canHandle: () => true,
            handle: input => input.responseBuilder
                .speak("Sorry, you can't do that here.")
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