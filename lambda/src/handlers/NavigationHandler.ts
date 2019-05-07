import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot, Slots } from "../lib/InputWrap"
import {Schema} from '../lib/Schema'
import { Response } from "ask-sdk-model";
import { includesOrEqual } from "../lib/Util";

export abstract class AutoNavigationHandler implements RequestHandler {
    protected readonly abstract intent: string|string[]

    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        //TODO: do check here if this.intent is same as wrap.resolvedPrevious
        return (wrap.isIntent(this.intent) || includesOrEqual(wrap.resolvedPreviousIntent, this.intent)) && this.canWrap(wrap)
    }

    /**
     * override for more handle checks than the navigation provides.
     * Intent name is checked inside nav code
     */
    canWrap(input: InputWrap){
        return true;
    }
    
    async handle(input: HandlerInput) {
        return this.handleWrap(await InputWrap.load(input))
    }

    abstract handleWrap(input: InputWrap): Promise<Response>
}