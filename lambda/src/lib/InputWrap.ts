import { HandlerInput, AttributesManager, ResponseBuilder } from "ask-sdk-core";
import { Intent, Slot } from "ask-sdk-model";
import {Schema} from './Schema'
import { Event, Response } from "./request";
import {OldLocations} from '../handlers/EventsHandler'
import { TutorialStage } from "../handlers/TutorialHandler";
import * as EventUtil from "./EventUtil"
import { includesOrEqual } from "./Util";
import moment = require("moment");

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

export interface Slots {
    [key: string]: CustomSlot | undefined;
}

interface PersistentAttrs {
    // [key: string]: any;
    prevLocations?: OldLocations
    refineRecommendCount?: number
    
    finishedTutorial?: boolean
    LaunchRequestRuns?: number
    totRequests?: number

    bookmarks?: Event[]
}

export default class InputWrap {

    readonly session: {
        [key: string]: any

        selectedEvent?: Event

        lastEventsSlots?: Slots
        lastEventsRequest?: Response<Event>
        eventRequestPage?: number

        /** stores the slots from the last request */
        lastSlots?: Slots

        /** list of the request type or intent name of all requests for this session.
         * most recent requests are at end of array
         */
        prevRequests?: string[]

        completedTutorialStage?: TutorialStage
    };
    
    persistent: PersistentAttrs = {}

    readonly intent?: Intent;
    /** Slots that have values */
    slots: Slots = {}

    private readonly attrs: AttributesManager;
    private readonly input: HandlerInput;

    readonly response: ResponseBuilder;

    private constructor(input: HandlerInput){
        this.input = input
        this.attrs = input.attributesManager;
        this.session = this.attrs.getSessionAttributes();

        let req = input.requestEnvelope.request

        this.response = input.responseBuilder

        if(req.type === "IntentRequest"){
            this.intent = req.intent;

            if(this.intent.slots){
                for (let slotKey in this.intent.slots){
                    let slot = this.intent.slots[slotKey]
                    if(slot.value)
                        this.slots[slotKey] = new CustomSlot(slot)
                }
            }
        }

        this.previousRedirect = this.resolvePreviousRedirect()
        if(this.previousRedirect)
            console.log("PREVIOUSRESOLVED: " + this.previousRedirect)
    }

    /**
     * Save request information for this request, to handle continued requests.
     * ONLY CALL THIS AT END OF REQUEST ONCE
     */
    async endRequest() {
        // if(this.intent)
        //     this.sessionAttrs.prevIntents = this.prevIntents.concat(this.intent)
        this.session.lastSlots = this.slots

        if(this.session.prevRequests === undefined) this.session.prevRequests = []
        this.session.prevRequests.push(this.intent ? this.intent.name : this.input.requestEnvelope.request.type)
        
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

    //TODO: test alexa permissions
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
        return this.intent !== undefined && includesOrEqual(this.intent.name, intentName)
    }

    readonly previousRedirect?: string;
    /**
     * resolves what the intentname of a string of PreviousIntents would be
     * @returns IntentName
     */
    private resolvePreviousRedirect() {
        if(!this.session.prevRequests || !this.intent || this.intent.name !== Schema.AMAZON.PreviousIntent)
            return

        let prevCount = 1;
        for (let i = this.session.prevRequests.length-1; 0 <= i; i--) {
            const elm = this.session.prevRequests[i];

            if(elm === Schema.AMAZON.PreviousIntent){
                prevCount++
            } else {
                let startLevel;
                if(Object.values(Schema.DetailIntents).concat(Schema.BookmarkEventIntent).includes(elm))
                    startLevel = 2
                else if(elm === Schema.SelectIntent)
                    startLevel = 1

                if(startLevel !== undefined){
                    let newLevel = startLevel-prevCount;
                    if(newLevel === 1)
                        return Schema.SelectIntent
                    else if(newLevel === 0)
                        return EventUtil.bookmarkMoreRecent(this) ? Schema.ListBookmarksIntent : Schema.EventsIntent
                }
            }
        }
    }

    private static instance: InputWrap;
    /**
     * load or return instance of InputWrap for this request 
     */
    static async load(input: HandlerInput) {
        //use instance in SaS model
        if(InputWrap.instance !== undefined && getReqId(InputWrap.instance.input) === getReqId(input))
            return InputWrap.instance
        else {
            InputWrap.instance = new InputWrap(input)
            InputWrap.instance.persistent = await this.loadPersistent()
            return InputWrap.instance
        }
    } 

    static async loadPersistent(): Promise<PersistentAttrs>{
        let attrs: PersistentAttrs = (await InputWrap.instance.attrs.getPersistentAttributes())
        if(attrs.bookmarks)
            attrs.bookmarks = attrs.bookmarks.filter(bookmark => moment(bookmark.datetime_end).isBefore())
        return attrs;
    }
}

let getReqId = (i: HandlerInput) => i.requestEnvelope.request.requestId