import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import AmazonSpeech from "ssml-builder/amazon_speech";
import categories from "../data/category-names.json";
import InputWrap from "../lib/InputWrap";
import { prettyJoin, rand, randN } from "../lib/Util";
import { Schema } from "../lib/Schema.js";

const examples = [
    "Find me opera concerts in wellington next week",
    "What's on in Auckland tomorrow",
    "Search for alternative gigs tonight",
    "Tell me what's happening at city gallery next month",
    `Ask ${Schema.INVOCATION} is there anything on tomorrow`,
    `Tell ${Schema.INVOCATION} to search for dj gigs tonight`
]

let filterSuggestions = [
    ["your location in New Zealand", "what's on in wellington next month"],
    ["a specific venue", "is there anything happening at san fran tonight"],
    ["a date", "find me events next thursday"],
    ["a time", "Search for events tonight"],
    ["a category", () => `find me ${rand(...categories)} events this week`]
]

//TODO: make intro phrases short and sweet and decrease over time

const orderedTutorials = [
    "I can find you New Zealand events based on your request. For example, Find me opera events in wellington next week",
    "Ask for information about New Zealand events. Remember that you can restart the tutorial any time just by asking.",
    "I will answer your queries about events in New Zealand. Did you know you can interrupt me while I'm talking by saying Alexa",
    // () => `You can filter events based off your location in New Zealand, a specific venue, a category such as ${categoriesString(3)}, a date or time. For example, Tell me what's happening at city gallery next month`,
    // "You can change your location, venue, category, date or time filter at any time by interrupting. For example, Set the location to auckland",
    // "You can skip this introduction by stating your request straight after saying 'alexa start ${Schema.INVOCATION}' and I will go straight to the results. For example, Alexa ask ${Schema.INVOCATION} what's on"

]

const tutorials = [
    "You can interrupt me while I'm talking by saying Alexa",
    ...filterSuggestions.map(suggestion => {
        let [name, example] = suggestion
        if(typeof example === "function")
            return () => `You could try filtering events based off ${name}. For example, ${(example as () => string)()}`
        else
            return `You could try filtering events based off ${name}. For example, ${example}`
    })

    ]

export class LaunchRequestHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    }

    getExample(speech?: AmazonSpeech): AmazonSpeech{
        speech = speech || new AmazonSpeech()
        return speech
            .say(rand("For example", "Try going", "Something like")).pauseByStrength("medium")
            .say(rand(...examples))
    }

    handle(handlerInput: HandlerInput) {    
        let input = InputWrap.get()

        let runs = input.persistent.LaunchRequestRuns = input.persistent.LaunchRequestRuns || 0
        input.persistent.LaunchRequestRuns = runs+1

        let tutorialI = Math.floor(runs/2)
        let tutorialAppend = tutorialI < orderedTutorials.length ? orderedTutorials[tutorialI] : rand(...tutorials)
        // let tutorialAppend = tutorials[tutorialI]

        if(typeof tutorialAppend === "function")
            tutorialAppend = tutorialAppend()

        let speech = new AmazonSpeech().say(`Welcome to ${Schema.INVOCATION}.`)
            .say(tutorialAppend)

        // this.getExample(speech)
        
        return handlerInput.responseBuilder
            .speak(speech.ssml())
            .reprompt(this.getExample().ssml())
            .getResponse()
    }   
}