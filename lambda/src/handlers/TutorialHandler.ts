import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";
import * as EventsHandler from './EventsHandler'

// let tutorialStages = 0 | 1 | 2
export enum TutorialStage {
    Intro,
    LocationReq,
    MultiFilter,
    Categories,
    Navigation
}

let exampleLocEventsCount = 100
let exampleDateEventsCount = 10
let newStepPause = "1s"
let rootCategories = "Workshops, Conferences & Classes, Concerts & Gig Guide, Performing Arts, Festivals & Lifestyle, Sports & Outdoors, Exhibitions"

export class TutorialHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        let reqs = wrap.persistent.totRequests || 0

        //do tutorial if never gotten past it and if tutorial stage is in bounds or undefined
        return !wrap.persistent.finishedTutorial && false
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        let prevTutorialStage = wrap.session.prevTutorialState
        // wrap.sessionAttrs.prevTutorialState = prevTutorialStage !== undefined ? prevTutorialStage+1 : TutorialStage.Intro

        let speech = new AmazonSpeech()
        let reprompt: string|undefined;
        let builder = input.responseBuilder

        //basic intro, get user to say start the local (unverified)
        if(prevTutorialStage === undefined){
            speech.say(
                `Hi, I'm alexa. Welcome to the local.
                I'm going to teach you how to find local events in New Zealand in 4 steps.`)
            .pause(newStepPause).say(
                `Step 1. You can say 'Alexa' at any time to get my attention.
                When speaking to me, make sure to speak slowly and clearly in a quiet environment.
                I should make a tone whenever I'm listening.
                After I'm listening, say your command. Let's try the command that starts the local.
                Say 'Alexa', wait for the tone, then say 'start the local'`
            ).pause("5s")
            reprompt = "Say 'Alexa', wait for the tone, then say 'start the local"
            wrap.session.prevTutorialState = TutorialStage.Intro

        //tell the user to request a location
        } else if(prevTutorialStage === TutorialStage.Intro) {
            speech.say("Great! Now you can wake me up and start this skill.")
            .pause(newStepPause)
            .say(
                `Step 2. I'm going to teach you how to make a request to find events in a location.
                Valid locations include any popular New Zealand city or town, like Auckland or Nelson.
                For example, if you lived in nelson, you could say 'What's on in Nelson', just like how you would ask a real person.
                Let's try that with your city or town now.`
            )
            reprompt = "Ask me to find events in your location just as you would ask a real person"
            wrap.session.prevTutorialState = TutorialStage.LocationReq

        } else if(prevTutorialStage === TutorialStage.LocationReq){
            let slotLoc = wrap.slots[Schema.LocationSlot]
            let lastLoc = wrap.session.lastSlots && wrap.session.lastSlots[Schema.LocationSlot]

            //read back location, ask for verify
            if(slotLoc && slotLoc.resValue){
                speech.say(`Thanks. I heard you ask for events in ${slotLoc.resValue}. 
                Say Yes if that's correct and I'll use it if you don't mention a location.
                If that's wrong, please ask for events in your location again, making sure to speak slowly and clearly.`)

                reprompt = `Say Yes if ${slotLoc.resValue} is correct.
                If I'm wrong, please ask for events in your location again, making sure to speak slowly and clearly.`

                //initialise top location with single entry until user verifies
                wrap.session.lastSlots = wrap.slots
                // wrap.resetTopLocation()
                // wrap.countLocation(slotLoc)

            //verified location, continuing tutorial
            } else if(wrap.isIntent(Schema.YesIntent) && lastLoc && lastLoc.resValue){
                wrap.resetTopLocation()
                wrap.countLocation(lastLoc)

                speech.say(
                    `Awesome. 
                    Whenever you have the local open, you can ask a question like that to hear a list of events.
                    With your location, I would start responding to you by saying:`)
                .sentence(`I found ${exampleLocEventsCount} events in ${lastLoc.resValue}, I'll read you the first ${EventsHandler.items}.`)
                .pause(newStepPause)
                .say(
                    `Step 3. 
                    To avoid going through all ${exampleLocEventsCount} events, let me teach you how to make your request more specific.
                    Along with location, you could specify a date, time, venue or an event category.
                    Let's use a date first. 
                    Just like the location request, you will ask me a natural question, except this time you will provide a date as well.
                    You can say a date in many ways such as; next week, saturday, november the 3rd, next year, and tomorrow.
                    For example, you could say, 'are there any events in Wellington next weekend?'
                    Your turn, make a request with your location and a date now.`
                )
                reprompt = "Ask for events with your location and a date, for example, 'Is there anything on in Hamilton on Tuesday?'"
                wrap.session.prevTutorialState = TutorialStage.MultiFilter
            
            //tell the user to do a location request and/or say yes
            } else {
                reprompt = "Ask me to find events and provide a location."
                speech.say(reprompt)
                    .say("For example, if you lived in Auckland, you could say 'Find me events in Auckland'.")
                if(lastLoc && lastLoc.resValue)
                    speech.say(`If ${lastLoc.resValue} was correct, just say Yes.`)
            }
        } else if(prevTutorialStage === TutorialStage.MultiFilter){
            let locSlot = wrap.slots[Schema.LocationSlot]
            let dateSlot = wrap.slots[Schema.DateSlot]

            //heard a location and date correctly
            if(locSlot && locSlot.resValue && dateSlot){
                let date = new AmazonDate(dateSlot.value)
                speech.say(`Nice work. I heard a location of ${locSlot.resValue} and a date of`)
                date.toSpeech(speech)
                speech.pauseByStrength("strong")
                
                speech.say(`I would normally say something like`)
                    .pauseByStrength("strong")
                    .say(`I found ${exampleDateEventsCount} events in ${locSlot.resValue}`)
                date.toSpeech(speech)
                speech.say(`, I'll read you the first ${EventsHandler.items}.`)
                    .say('You can now refine your search for events with a date and location.')
                    .pause(newStepPause)
                    .say(`Step 4.
                        I also understand different types of events.
                        This includes music genres, Sports, Art Exhibitions and many more.
                        If there are too many events to read out, 
                        I will tell you the top event categories you could choose from.
                        For this example, let's say I have read out the following categories to choose from:
                        ${rootCategories}.
                        We are going to skip that and choose a category now.
                        Say alexa to interrupt me, then say one of the categories.`
                    )
                    .pause("5s")
                reprompt = "Say one of the following: " + rootCategories

            //tell user to make a multifilter request
            } else{
                reprompt = "Ask for events with your location and a date"
                speech.say(reprompt + ", for example, 'Is there anything on in Hamilton on Tuesday?'")
            }
        } else if(prevTutorialStage === TutorialStage.Categories) {
            let catSlot = wrap.slots[Schema.CategorySlot]
            if(catSlot && catSlot.resValue){
                speech.say("I heard you say " + catSlot.resValue)
                speech.say(`Congratulations. 
                You now have all the basics needed to use the local. 
                I'll leave you now, remember you can open me up by going Alexa start the local.`)

                wrap.persistent.finishedTutorial = true
                return builder.speak(speech.ssml()).getResponse()
            } else {
                speech.say("Say one of the following categories: " + rootCategories)
                reprompt = "Say one of the following: " + rootCategories
            }
        } else
            throw new Error("End of tutorial reached")

        let ssml = speech.ssml().replace(/(\r\n|\n|\r)/gm, "");
        builder.speak(ssml)
            .reprompt(reprompt)

        return builder.getResponse()
    }
}