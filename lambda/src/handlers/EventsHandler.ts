import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event, getCategoryChildren, CategoryInfo, eventFindaRequest, maxParallelRequests} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";
import AmazonTime from "../lib/AmazonTime";
import { EventSelectHandler } from "./EventSelectHandler";
import DateRange from "../lib/DateRange";
import moment from 'moment-timezone'
import { prettyJoin } from "../lib/Util";
import categories from '../data/category-names.json'
import * as EventUtil from '../lib/EventUtil'

//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html

export interface OldLocations{
    [slug: string]: LocationFrequency
}

interface LocationFrequency {
    frequency: number,
    place: CustomSlot
}

//TODO: only trigger recommendation on multiple pages (3)
export const items = 4*3

/**
 * @returns empty string when invalid id
 * @param id 
 */
function getCategoryName(id?: number) {
    if(id === undefined)
        return ""

    let cat = categories.find(cat => cat.id === id.toString())
    return cat ? cat.title : ""
}

export class EventsHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input);

        let backToEvents = EventSelectHandler.isPrevIntent(wrap) && !EventUtil.bookmarkMoreRecent(wrap)
        console.log("EVENTSHANDLERWRAP: " + JSON.stringify(wrap))
        console.log("BACKTOEVENTS: " + backToEvents)

        //handle SetIntents if no previous request exists
        return wrap.isIntent(Object.values(Schema.SetIntents).concat(Schema.EventsIntent)) || backToEvents
    }

    async handle(input: HandlerInput){
        return this.handleWrap(await InputWrap.load(input))
    }
    
    async handleWrap(input: InputWrap) {
        //check for venue (more specific) first
        let venueSlot = input.slots[Schema.VenueSlot]
        //venue must have resolution id (location slug)
        let isVenue = venueSlot !== undefined && venueSlot.resId !== undefined

        let place = isVenue ? venueSlot : input.slots[Schema.LocationSlot]

        // let prevLocations = input.persistent.prevLocations || {}

        //if no place from venue or location, load from most recent location used
        if((!place || !place.resId)){
            let topLocation = input.getTopLocation()
            if(topLocation)
                place = topLocation
        }
        // if((!place || !place.resId) && Object.keys(prevLocations).length){
        //     //replace best place no best or if best is venue and new isn't or if both are equally venuey and new is higher frequency
        //     let bestOldLocation = Object.values(prevLocations).reduce((prev, cur) => 
        //         (!prev || prev.frequency < cur.frequency) ? cur : prev)

        //     if(bestOldLocation){
        //         place = bestOldLocation.place
        //         isVenue = false
        //     }
        // }
        
        //if finally has a place, else tell the user to say a location and give hint
        if(place){
            let slug = place.resId
            let placeName = place.resValue
            //verify place is real, else tell user
            if(slug && placeName){

                //save the last used location in case the user doesn't use a location in future requests
                //TODO: if venue, use venue's location
                if(!isVenue){
                    input.countLocation(place)
                }

                //parse date
                let dateSlot = input.slots[Schema.DateSlot]
                let timeSlot = input.slots[Schema.TimeSlot]
                let range: DateRange|undefined = undefined
                if(dateSlot)
                    range = new AmazonDate(dateSlot.value)

                if(timeSlot){
                    let time = new AmazonTime(timeSlot.value)
                    if(range instanceof AmazonDate)
                        range.setTime(time)
                    else
                        range = time
                }

                let category = input.slots[Schema.CategorySlot]
                let categoryId = category && category.resId ? Number.parseInt(category.resId) : undefined

                //start request object for api request
                let req = {
                    location_slug: slug,
                    rows: items,
                    start_date: range && range.startISO(),
                    end_date: range && range.endISO(),
                    //sort by date if venue or any more specific info was given
                    order: (isVenue || range || category) ? EventRequestOrder.date : EventRequestOrder.popularity,
                    category: categoryId
                } as EventRequest

                //request events list
                let events = await getEvents(req)
                    
                let categoryName = getCategoryName(categoryId)

                //compile response
                let speech = new AmazonSpeech()
                if(events.count == 0)
                    speech.say(`I couldn't find any ${categoryName} events`)
                else
                    speech.say("I found").say(events.count.toString())
                        .say(categoryName).say(events.count == 1 ? "event" : "events")
                
                speech.say((isVenue ? "at " : "in ") + placeName)

                if(range)
                    range.toSpeech(speech)

                if(events.count === 0){
                    speech.pauseByStrength("strong")
                    speech.say("Please try again or change one of your filters")
                } else if(events.list.length == 1) {
                    speech.pauseByStrength("strong")
                    EventUtil.getSpeech(events.list[0], speech)
                } else {
                    if((items < events.count)){
                        speech.pauseByStrength("strong")

                        //get list of categories (either root list or)
                        let catChildren = await getCategoryChildren(categoryId)

                        if(catChildren.length){
                            let reqClone = Object.assign({fields: "event:()"}, req)
                            reqClone.rows = 1
                            reqClone.fields = "event:(id)"

                            let catCounts: {cat:CategoryInfo,count:number}[] = []

                            let awaits: Promise<void>[] = []

                            for (const cat of catChildren) {
                                reqClone.category = cat.id

                                awaits.push(getEvents(reqClone).then(resp => {
                                    if(resp.count)
                                        catCounts.push({
                                            cat: cat,
                                            count: resp.count
                                        })
                                }))

                                //10 concurrent requests
                                if(maxParallelRequests < awaits.length){
                                    await Promise.all(awaits)
                                    awaits = []
                                } 
                            }

                            if(awaits.length)
                                await Promise.all(awaits)

                            //TODO: use nicer category names, derived from model generator
                            //if less than 0, a first
                            catCounts = catCounts.sort((a, b) => b.count-a.count)
                            catCounts.splice(6)

                            //TODO: look for extraneous gap inside cat name
                            let catInfos = catCounts.map(catInfo => catInfo.count.toString() + " in " + getCategoryName(catInfo.cat.id))

                            speech.say("The top categories available to make this search more specific, ordered by popularity, are")
                                .say(prettyJoin(catInfos, "or"))
                                .pauseByStrength("strong")
                                .say("You could apply that now by saying alexa followed by the category")
                            // eventsForCategory.forEach(catInfo => {
                            //     speech.say(`${catInfo.count} ${catInfo.cat.name}`)
                            // })
                        } else {
                            let [name, suggestion] = !dateSlot ? ["date", "next week"] :
                                !isVenue ? ["venue", "city gallery"] :
                                !timeSlot ? ["time", "tonight"] :
                                ["more specific date", "next tuesday"]
    
                            // let unadded = []
                            // if(!categoryName) unadded.push('event type')
                            // if(!isVenue) unadded.push('venue')
                            // if(!dateSlot) unadded.push('date')
                            // if(!timeSlot) unadded.push('time')
    
                            speech.say(`You could make this search more specific by interrupting and
                                setting the ${name}, for example, alexa set ${name} to ${suggestion}`)
                                .pauseByStrength("strong")

                            speech.say("I'll read you the first").say(items.toString()).say("now")
                        }

                        // input.persistent.refineRecommendCount = refineRecommendCount+1
                        // input.setPersistentAttr(refineRecommendCountKey, refineRecommendCount+1)
                    }

                    speech.pause('0.8s')
                
                    events.list.forEach((event, i) => {
                        let startDate = new AmazonDate(event.datetime_start, event.datetime_end)
                        if(!isVenue)
                            speech.say('At').say(event.location.name)
                            
                        speech.say("I have").say(event.name)
                        startDate.toSpeech(speech, true)

                        speech.pauseByStrength("medium").say("for details say number")
                        .say((i+1).toString()).pauseByStrength("x-strong")
                    })

                    input.session.lastEvents = events

                    speech.sentence('Tell me which event you want to know more about by saying Alexa followed by the number')
                }
                
                return input.response
                    .speak(speech.ssml())
                    .reprompt(`You can ${1 < events.list.length ? `choose one of the ${events.list.length} events, ` : ""}refine a search filter or start from scratch`)
                    .getResponse()
            } else
                return input.response
                    .speak(`Sorry, I don't know anywhere called ${place.value}, please ask me again slowly`)
                    .reprompt("Please ask your question again slowly")
                    .getResponse()
        //no location provided
        } else
            return input.response
                .speak(`Please ask me again with a valid location or venue. I will remember your most frequent location.`)
                .reprompt("Please ask your question again slowly")
                .getResponse()
    }
}