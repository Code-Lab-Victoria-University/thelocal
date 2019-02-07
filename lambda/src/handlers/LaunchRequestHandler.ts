import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model"
import { rand } from "../lib/Util";
import InputWrap from "../lib/InputWrap";
import AmazonSpeech from "ssml-builder/amazon_speech"

const examples = [
    "Find me opera concerts in wellington next week",
    "What's on in Auckland tomorrow",
    "Search for alternative gigs tonight",
    "Tell me what's happening at city gallery next month",
    "Ask the local is there anything on tomorrow",
    "Tell the local to search for dj gigs tonight"
]

const tutorials = [
    "I can find you local events.",
    "You can search based off your location in New Zealand, a specific venue, a category, a date or time",
    "You can request for help about a specific action or in general any time",
    "If you find my greeting annoying, say your request straight after saying 'alexa start the local' and I will go straight to the results"
]

const runsKey = "LaunchRequestRuns"

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {    
        let input = new InputWrap(handlerInput)

        let runs = await input.getPersistentAttr<number>(runsKey) || 0
        await input.setPersistentAttr<number>(runsKey, runs+1)

        let tutorialAppend = runs < tutorials.length ? tutorials[runs] : ""

        let reprompt = new AmazonSpeech()
            .say(rand("For example", "Try going", "Something like")).pauseByStrength('medium')
            .say(rand(...examples))
        
        return handlerInput.responseBuilder
            .speak("Welcome to the local. " + tutorialAppend)
            .reprompt(reprompt.ssml())
            .getResponse()
    }   
}