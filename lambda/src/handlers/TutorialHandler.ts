import { HandlerInput, RequestHandler } from "ask-sdk-core";
import AmazonSpeech from 'ssml-builder/amazon_speech';
import InputWrap from "../lib/InputWrap";
import { getCategoryChildren } from "../lib/request";
import { Schema } from '../lib/Schema';
import { SpokenDateTime } from "../lib/SpokenDateTime";
import { getCategoryName, prettyJoin } from "../lib/Util";
import * as EventsHandler from './EventsHandler';

// let tutorialStages = 0 | 1 | 2
/**
 * In the code formatting, these denote when the user is first requested this information, not when this stage is passed.
 */
export enum TutorialStage {
    Intro,
    LocationReq,
    MultiFilter,
    Categories,
    Exit,
    Final
}

let exampleLocEventsCount = 100
let exampleDateEventsCount = 10
let newStepPause = "1s"

let rootCategories: string|undefined;
(async () => rootCategories = prettyJoin((await getCategoryChildren()).map(child => getCategoryName(child.id)), "or"))()

function wait5s(text: string): string{
    return new AmazonSpeech().say(text).pause('5s').ssml()
}

export class TutorialHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = InputWrap.get()
        let reqs = wrap.persistent.totRequests || 0

        //do tutorial if never finished or requested or currently in tutorial (was requested)
        return !wrap.persistent.finishedTutorial || wrap.isIntent(Schema.TutorialIntent) || wrap.session.completedTutorialStage !== undefined
    }
    
    handle(input: HandlerInput) {
        let wrap = InputWrap.get()

        let prevTutorialStage = wrap.session.completedTutorialStage
        let curStage = prevTutorialStage !== undefined ? prevTutorialStage+1 : 0
        // wrap.sessionAttrs.prevTutorialState = prevTutorialStage !== undefined ? prevTutorialStage+1 : TutorialStage.Intro

        let speech = new AmazonSpeech()
        let reprompt: string|undefined;
        let builder = input.responseBuilder

        let nextStage = () => wrap.session.completedTutorialStage = curStage

        if(curStage === TutorialStage.Intro){ //basic intro, get user to say start ${Schema.INVOCATION} (unverified)
            speech.say(
                `Hi. Welcome to ${Schema.INVOCATION}.
                In this 4 step tutorial I'm going to teach you how to find local events in New Zealand.`)
            .pause(newStepPause).say(
                `Step 1. You can say 'Alexa' at any time to get my attention.
                When talking to me, make sure to speak slowly and clearly in a quiet environment.
                Depending on my settings, I will make a tone or light up whenever I'm listening.
                When I'm listening, you can give me a command. Let's try the command to start ${Schema.INVOCATION}.
                Say 'Alexa', then say 'start ${Schema.INVOCATION}'`
            ).pause("5s")
            reprompt = wait5s(`Say 'Alexa', wait for the tone, then say 'start ${Schema.INVOCATION}`)
            nextStage()

        } else if(curStage === TutorialStage.LocationReq) { //request a location
            speech.say("Great! Now you can get my attention and start this skill.")
            .pause(newStepPause)
            .say(
                `Step 2. I'm going to teach you how to make a request to find events in a location.
                Valid locations include any major New Zealand city or town, like Auckland or Nelson.
                For example, if you lived in nelson, you could say 'What's on in Nelson'.
                Let's try that with your city or town now.`
            )
            reprompt = "Ask me to find events in your location just as you would ask a real person"
            nextStage()

        } else if(curStage === TutorialStage.MultiFilter){ //date and location in one request
            let slotLoc = wrap.slots[Schema.LocationSlot]
            let lastLoc = wrap.session.lastSlots && wrap.session.lastSlots[Schema.LocationSlot]

            //read back location, ask for verify
            if(slotLoc && slotLoc.resValue){
                speech.say(`Thanks. I heard you ask for events in ${slotLoc.resValue}. 
                Say Yes if that's correct.
               Otherwise, please ask for events in your location again, making sure to speak slowly and clearly.`)

                reprompt = `Say Yes if ${slotLoc.resValue} is correct.
                If I'm wrong, please ask for events in your location again, making sure to speak slowly and clearly.`

            //verified location, continuing tutorial
            } else if(wrap.isIntent(Schema.AMAZON.YesIntent) && lastLoc && lastLoc.resValue){
                wrap.resetTopLocation()
                wrap.countLocation(lastLoc)

                speech.say(
                    `Awesome. 
                    Whenever you have ${Schema.INVOCATION} open, you can ask a question like that to hear a list of events.
                    With your location, I would start responding to you by saying:`)
                .sentence(`I found ${exampleLocEventsCount} events in ${lastLoc.resValue}, I'll read you the first ${EventsHandler.items}.`)
                .pause(newStepPause)
                .say(
                    `Step 3. 
                    To avoid listening to a long list of all ${exampleLocEventsCount} events, let me teach you how to make your request more specific.
                    Along with location, you could specify a date, time, venue or an event category.
                    Let's use a date first. 
                    Just like the location request, you will ask me a question, except this time you will provide a date as well.
                    Some valid dates are; next week, saturday, november the 3rd, next year, and tomorrow.
                    For example, you could say, 'are there any events in ${wrap.getTopLocation()!.value} next weekend?'
                    Your turn, make a request with your location and a date now.`
                )
                reprompt = "Ask for events with your location and a date, for example, 'Is there anything on in Hamilton on Tuesday?'"
                nextStage()
            
            //tell the user to do a location request and/or say yes
            } else {
                reprompt = "Ask me to find events and provide a location."
                speech.say(reprompt)
                    .say("For example, if you lived in Auckland, you could say 'Find me events in Auckland'.")
                if(lastLoc && lastLoc.resValue)
                    speech.say(`If ${lastLoc.resValue} was correct, just say Yes.`)
            }

        //get the user to use the categories interface
        } else if(curStage === TutorialStage.Categories){ //set a category
            let locSlot = wrap.slots[Schema.LocationSlot]
            let dateSlot = wrap.slots[Schema.DateSlot]

            //heard a location and date correctly
            if(locSlot && locSlot.resValue && dateSlot){
                let date = new SpokenDateTime(dateSlot.value)
                speech.say(`I heard a location of ${locSlot.resValue} and a date of`)
                date.toSpeech(speech)
                speech.pauseByStrength("strong")
                
                speech.say(`I would normally say something like`)
                    .pauseByStrength("strong")
                    .say(`I found ${exampleDateEventsCount} events in ${locSlot.resValue}`)
                date.toSpeech(speech)
                speech.say(`, I'll read you the first ${EventsHandler.items}.`)
                    .say('Nice work. You can now refine your search for events with a')
                    .phoneme("ipa", "deɪt", "date").say('and location.')
                    
                    .pause(newStepPause)
                    .say(`Step 4.
                        I also understand different types of events.
                        This includes music genres, Sports, Art Exhibitions and many more.
                        If there are too many events on for me to list, 
                        I will tell you the top event categories you can choose from.
                        For this example, you can select one of the following:
                        ${rootCategories}.
                        Say alexa to interrupt me, wait for the tone, then say one of the categories.`
                    )
                    .pause("5s")
                reprompt = "Say one of the following: " + rootCategories
                nextStage()

            //tell user to make a multifilter request
            } else{
                reprompt = "Ask for events with your location and a date"
                speech.say(reprompt + ", for example, 'Is there anything on in Hamilton on Tuesday?'")
            }

        //teach the user to exit uses AMAZON.StopIntent as per https://developer.amazon.com/docs/custom-skills/standard-built-in-intents.html#about-canceling-and-stopping
        } else if(curStage === TutorialStage.Exit) {
            
            let catSlot = wrap.slots[Schema.CategorySlot]
            if(catSlot && catSlot.resValue){
                speech.say(`I heard you say ${catSlot.resValue}.
                    Easy. In the future, if you already know the category you want, you can include it in your command
                    by saying something like, 'Find me music events next weekend'.

                    Onto the final step, Stopping the skill.
                    I will keep asking you questions unless you stay silent or tell me to stop.
                    This will exit out of the skill and stop our conversation.
                    As with other requests, you can interrupt me at any time by saying my name, then requesting an action like stop.
                    Try saying 'Alexa Stop' now.`)
                .pause('5s')

                reprompt = wait5s("Say 'Alexa stop'")

                nextStage()
            } else {
                speech.say("Say one of the following categories: " + rootCategories)
                reprompt = "Say one of the following: " + rootCategories
            }
        } else if(curStage === TutorialStage.Final){
            if(wrap.isIntent([Schema.AMAZON.StopIntent, Schema.AMAZON.CancelIntent])){
                speech.say(`Congrats, you now have all the basics needed to use ${Schema.INVOCATION}. 
                    You can open up this tutorial at any time in the future by saying start the tutorial while ${Schema.INVOCATION} is open.
                    I'll stay open now. From here you can exit or ask me a question about what's on in your city`)
                    
                reprompt = "You can exit or go ahead and ask me what's on"
    
                wrap.persistent.finishedTutorial = true
                wrap.session.completedTutorialStage = undefined
            } else{
                reprompt = wait5s("Say 'Alexa stop'")
                speech.say(reprompt)
            }
        } else
            throw new Error("Invalid tutorial state")

        let ssml = speech.ssml().replace(/(\r\n|\n|\r)/gm, "");
        builder.speak(ssml)
            .reprompt(new AmazonSpeech().say(reprompt).ssml())

        return builder.getResponse()
    }
}
