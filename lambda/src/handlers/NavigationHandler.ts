import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import InputWrap from "../lib/InputWrap";
import { includesOrEqual } from "../lib/Util";

/**
 * Will trigger handle if is intent matches and canWrap returns true
 */
export abstract class AutoNavigationHandler implements RequestHandler {
    protected readonly abstract intent: string|string[]

    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input)

        //TODO: do check here if this.intent is same as wrap.resolvedPrevious
        return (wrap.isIntent(this.intent) || includesOrEqual(wrap.previousRedirect, this.intent)) && this.canWrap(wrap)
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