import { HandlerInput, AttributesManager, ResponseBuilder } from "ask-sdk-core";
import { Intent, Slot } from "ask-sdk-model";
import {Schema} from './Schema'
import { Event, Response } from "./request";

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

export default class InputWrap {

    readonly sessionAttrs: {
        [key: string]: any;

        // prevIntents?: Intent[],
        lastEvents?: Response<Event>,
        // [lastSlotsKey]?: Slots,
        lastSlots?: Slots
    };
    
    private readonly persistentAttrs: Promise<{
        [key: string]: any;
    }>;

    readonly intent?: Intent;
    // readonly prevIntents: Intent[];
    /** Slots that have values */
    slots: Slots = {}

    private readonly attrs: AttributesManager;

    readonly response: ResponseBuilder;

    constructor(input: HandlerInput){
        this.attrs = input.attributesManager;
        this.sessionAttrs = this.attrs.getSessionAttributes();
        this.persistentAttrs = this.attrs.getPersistentAttributes()

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

    endRequest() {
        // if(this.intent)
        //     this.sessionAttrs.prevIntents = this.prevIntents.concat(this.intent)
        
        this.attrs.setSessionAttributes(this.sessionAttrs)
        this.attrs.savePersistentAttributes()
    }

    // lastIntent(): Intent|undefined {
    //     return 0 < this.prevIntents.length ? this.prevIntents[this.prevIntents.length-1] : undefined
    // }

    // getSlot(slotName: string): CustomSlot|undefined {
    //     return this.slots[slotName]
    // }

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

    // hasSessionAttr(key: string): boolean {
    //     return this.sessionAttrs[key] !== undefined
    // }

    async getPersistentAttr<RetType>(key: string): Promise<RetType|undefined>{
        return (await this.persistentAttrs)[key] as RetType
    }

    async setPersistentAttr<InType>(key: string, val: InType){
        (await this.persistentAttrs)[key] = val
        this.attrs.setPersistentAttributes(await this.persistentAttrs)
    }
}