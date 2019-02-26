import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";

// let tutorialStages = 0 | 1 | 2
export enum TutorialStage {
    Intro,
    BasicReq,
    MultiFilter,
    Categories,
    Navigation
}

export class TutorialHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)
        let reqs = wrap.persistentAttrs.totRequests || 0
        return (!wrap.persistentAttrs.LaunchRequestRuns)
        // return wrap.isIntent(Schema.SelectIntent) && wrap.sessionAttrs.lastEvents !== undefined
    }
    
    async handle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        let prevTutorialStage = wrap.sessionAttrs.prevTutorialState
        wrap.sessionAttrs.prevTutorialState = prevTutorialStage !== undefined ? prevTutorialStage+1 : TutorialStage.Intro

        if(prevTutorialStage === undefined){
            let speech = new AmazonSpeech()
            .say(
                `Hi, I'm alexa. Welcome to the local.
                I'm going to teach you how to find local events in New Zealand in 6 steps.
                Step 1. You can say 'Alexa' at any time to get my attention.
                When speaking to me, make sure to speak slowly and clearly in a quiet environment.
                I should make a tone whenever I'm listening to you.
                After I'm listening, say your command. Let's try the command that starts the local.
                Say 'Alexa', wait for the tone, then say 'start the local'`
            ).pause("5s")
            return input.responseBuilder.speak(speech.ssml()).getResponse()
        }

        // let speech = new AmazonSpeech()

        return input.responseBuilder.getResponse()
    }
}