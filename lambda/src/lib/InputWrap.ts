import { HandlerInput, AttributesManager, ResponseBuilder } from "ask-sdk-core";
import { Intent, Slot } from "ask-sdk-model";
import {Schema} from './Schema'
import { Event, Response } from "./request";
import {OldLocations} from '../handlers/EventsHandler'
import { Handler } from "aws-sdk/clients/lambda";
import { TutorialStage } from "../handlers/TutorialHandler";

export class CustomSlot {
    /** name of slot */
    readonly name: string;
    /** spoken value */
    readonly value: string;

    /** resolution id */
    readonly resId?: string;

    /** resolution value */
    readonly resValue?: string;

    constructor(slot: Slot){
        this.name = slot.name;
        this.value = slot.value;

        if(slot.resolutions && 
            slot.resolutions.resolutionsPerAuthority && 
            slot.resolutions.resolutionsPerAuthority[0].values){
                this.resId = slot.resolutions.resolutionsPerAuthority[0].values[0].value.id
                this.resValue = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name
        }
    }
}

interface Slots {
    [key: string]: CustomSlot | undefined;
}

interface PersistentAttrs {
    // [key: string]: any;

    prevLocations?: OldLocations
    refineRecommendCount?: number
    
    finishedTutorial?: boolean
    LaunchRequestRuns?: number
    totRequests?: number
}

export default class InputWrap {

    readonly session: {
        [key: string]: any

        // prevIntents?: Intent[],
        lastEvents?: Response<Event>
        // [lastSlotsKey]?: Slots,
        lastSlots?: Slots
        prevTutorialStage?: TutorialStage
    };
    
    persistent: PersistentAttrs = {}

    readonly intent?: Intent;
    /** Slots that have values */
    slots: Slots = {}

    private readonly attrs: AttributesManager;

    readonly response: ResponseBuilder;

    private constructor(input: HandlerInput){
        this.attrs = input.attributesManager;
        this.session = this.attrs.getSessionAttributes();
        // this.persistentPromise = this.attrs.getPersistentAttributes()

        let req = input.requestEnvelope.request

        this.response = input.responseBuilder

        // this.prevIntents = this.sessionAttrs.prevIntents || []

        if(req.type === "IntentRequest"){
            this.intent = req.intent;
            
            //this should never happen
            // if(this.prevIntents.includes(this.intent))
            //     throw new Error("prevIntents already contains current intent. Did you run #endRequest() before end?")

            if(this.intent.slots){
                for (let slotKey in this.intent.slots){
                    let slot = this.intent.slots[slotKey]
                    if(slot.value)
                        this.slots[slotKey] = new CustomSlot(slot)
                }
            }
        }
    }

    async endRequest() {
        // if(this.intent)
        //     this.sessionAttrs.prevIntents = this.prevIntents.concat(this.intent)
        
        this.attrs.setSessionAttributes(this.session)
        // this.setPersistentAttr('request', )
        
        this.persistent.totRequests = (this.persistent.totRequests || 0) + 1

        // (await this.persistentAttrs)
        this.attrs.setPersistentAttributes(this.persistent)
        await this.attrs.savePersistentAttributes()
    }

    resetTopLocation(){
        this.persistent.prevLocations = {}
    }

    getTopLocation(){
        let prevLocations = this.persistent.prevLocations

        //if no place from venue or location, load from most recent location used
        if(prevLocations && Object.keys(prevLocations).length){
            //replace best place no best or if best is venue and new isn't or if both are equally venuey and new is higher frequency
            let bestOldLocation = Object.values(prevLocations).reduce((prev, cur) => 
                (!prev || prev.frequency < cur.frequency) ? cur : prev)

            if(bestOldLocation){
                return bestOldLocation.place
            }
        }
    }

    countLocation(location: CustomSlot){
        if(!this.persistent.prevLocations)
            this.persistent.prevLocations = {}

        let slug = location.resId
        let placeName = location.resValue

        if(slug && placeName){
            this.persistent.prevLocations[slug] = this.persistent.prevLocations[slug] || {
                frequency: 0,
                place: location
            }
            this.persistent.prevLocations[slug].frequency += 1
        } else
            throw new Error("Provided location doesn't have a valid resId and resValue, got " + JSON.stringify(location))
    }

    /**
     * Is the wrapper an intent
     * @param intentName optionally query intent name
     */
    isIntent(intentName?: string|string[]): boolean{
        if(this.intent === undefined)
            return false
        //intent exists. If gave intentName, only true if equals intent.name
        else if(intentName === undefined)
            return true
        else if(typeof intentName === "string")
            return intentName === this.intent.name
        else
            return intentName.includes(this.intent.name)
    }

    static async load(input: HandlerInput) {
        let wrap = new InputWrap(input)
        wrap.persistent = await wrap.attrs.getPersistentAttributes()
        return wrap
    }
}