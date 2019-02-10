import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model"
import { rand, randN } from "../lib/Util";
import InputWrap from "../lib/InputWrap";
import AmazonSpeech from "ssml-builder/amazon_speech"
import {readFile, readFileSync} from "fs"
import {join} from "path"
import categoryNames from "../data/category-names.json"

const examples = [
    "Find me opera concerts in wellington next week",
    "What's on in Auckland tomorrow",
    "Search for alternative gigs tonight",
    "Tell me what's happening at city gallery next month",
    "Ask the local is there anything on tomorrow",
    "Tell the local to search for dj gigs tonight"
]

function categoriesString(n: number){
    let arr = randN(categoryNames, n)
    return arr.slice(0, -1).join(", ") + " or " + arr[arr.length-1]
}

const tutorials = [
    "I can find you local events.",
    () => `You can search based off your location in New Zealand, a specific venue, a category such as ${categoriesString(3)}, a date or time`,
    "You can request for help about a specific action or in general any time",
    "You can interrupt me at any time and start speaking if you already know what you want",
    "You can say your request straight after saying 'alexa start the local' and I will go straight to the results"
]

const runsKey = "LaunchRequestRuns"

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }

    getExample(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()
        return new AmazonSpeech()
            .say(rand("For example", "Try going", "Something like")).pauseByStrength('medium')
            .say(rand(...examples))
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {    
        let input = new InputWrap(handlerInput)

        let runs = await input.getPersistentAttr<number>(runsKey) || 0
        await input.setPersistentAttr<number>(runsKey, runs+1)

        let tutorialI = Math.floor(runs/2)
        let tutorialAppend = tutorialI < tutorials.length ? tutorials[tutorialI] : rand(...tutorials)

        if(typeof tutorialAppend === "function")
            tutorialAppend = tutorialAppend()

        let speech = new AmazonSpeech().say("Welcome to the local.")
            .say(tutorialAppend)

        if(tutorialI === 0)
            this.getExample(speech)
        
        return handlerInput.responseBuilder
            .speak(speech.ssml())
            .reprompt(this.getExample().ssml())
            .getResponse()
    }   
}