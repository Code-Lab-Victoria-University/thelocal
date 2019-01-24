import { HandlerInput, AttributesManager, ResponseBuilder } from "ask-sdk-core";
import { Response, IntentRequest, Request, Intent, Slot } from "ask-sdk-model";

export class CustomSlot {
    readonly name: string;
    readonly spoken: string;
    readonly id?: string;
    readonly value?: string;

    constructor(slot: Slot){
        this.name = slot.name;
        this.spoken = slot.value;

        if(slot.resolutions && slot.resolutions.resolutionsPerAuthority){
            this.id = slot.resolutions.resolutionsPerAuthority[0].values[0].value.id
            this.value = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name
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
    readonly req: Request;
    readonly builder: ResponseBuilder;

    readonly intent?: Intent;
    readonly slots?: {
        [key: string]: CustomSlot;
    }

    private readonly attrs: AttributesManager;

    constructor(input: HandlerInput){
        this.attrs = input.attributesManager;
        this.sessionAttrs = this.attrs.getSessionAttributes();
        this.persistentAttrs = this.attrs.getPersistentAttributes()
        
        this.req = input.requestEnvelope.request

        this.builder = input.responseBuilder

        if(this.req.type === "IntentRequest"){
            this.intent = this.req.intent;
            if(this.intent.slots){
                this.slots = {}
                for (let slotKey in this.intent.slots){
                    this.slots[slotKey] = new CustomSlot(this.intent.slots[slotKey])
                }
            }
        }
    }

    getSessionAttr<Type>(key: string): Type{
        return this.sessionAttrs[key]
    }

    setSessionAttr(key: string, val: any){
        this.sessionAttrs[key] = val
        this.attrs.setSessionAttributes(this.sessionAttrs)
    }


    async getPresistentArr(key: string){
        return (await this.persistentAttrs)[key]
    }

    async setPersistentAttr(key: string, val: any){
        (await this.persistentAttrs)[key] = val
        this.attrs.setPersistentAttributes((await this.persistentAttrs))
        await this.attrs.savePersistentAttributes()
    }
}