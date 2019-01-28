import { HandlerInput, AttributesManager, ResponseBuilder } from "ask-sdk-core";
import { Response, IntentRequest, Request, Intent, Slot } from "ask-sdk-model";

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

export default class InputWrap {

    private readonly sessionAttrs: {
        [key: string]: any;
    };
    
    private readonly persistentAttrs: Promise<{
        [key: string]: any;
    }>;

    readonly intent?: Intent;
    /** Slots that have values */
    readonly slots?: {
        [key: string]: CustomSlot | undefined;
    }

    private readonly attrs: AttributesManager;

    constructor(input: HandlerInput){
        this.attrs = input.attributesManager;
        this.sessionAttrs = this.attrs.getSessionAttributes();
        this.persistentAttrs = this.attrs.getPersistentAttributes()

        let req = input.requestEnvelope.request

        if(req.type === "IntentRequest"){
            this.intent = req.intent;
            if(this.intent.slots){
                this.slots = {}
                for (let slotKey in this.intent.slots){
                    let slot = this.intent.slots[slotKey]
                    if(slot.value)
                        this.slots[slotKey] = new CustomSlot(slot)
                }
            }
        }
    }

    getSessionAttr<Type>(key: string): Type|undefined{
        return this.sessionAttrs[key]
    }

    setSessionAttr(key: string, val: any){
        this.sessionAttrs[key] = val
        this.attrs.setSessionAttributes(this.sessionAttrs)
    }

    async getPresistentArr<RetType>(key: string): Promise<RetType|undefined>{
        return (await this.persistentAttrs)[key] as RetType
    }

    async setPersistentAttr(key: string, val: any){
        (await this.persistentAttrs)[key] = val
        this.attrs.setPersistentAttributes((await this.persistentAttrs))
        await this.attrs.savePersistentAttributes()
    }
}