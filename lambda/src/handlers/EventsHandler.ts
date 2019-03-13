import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event, getCategoryChildren, CategoryInfo, eventFindaRequest} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";
import AmazonTime from "../lib/AmazonTime";
import { EventSelectHandler } from "./EventSelectHandler";
import DateRange from "../lib/DateRange";
import moment from 'moment-timezone'

//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html

export interface OldLocations{
    [slug: string]: LocationFrequency
}

interface LocationFrequency {
    frequency: number,
    place: CustomSlot
}
let prevLocationsKey = "prevLocations"

export const items = 4

export class EventsHandler implements RequestHandler {
    async canHandle(input: HandlerInput) {
        let wrap = await InputWrap.load(input);

        return wrap.isIntent(Object.values(Schema.SetIntents).concat(Schema.EventsIntent))
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

        //save this request in case user wants to set parameters
        input.session.lastSlots = input.slots

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

                if(range)
                    console.log(JSON.stringify(range))

                let category = input.slots[Schema.CategorySlot]

                //start request object for api request
                let req = {
                    location_slug: slug,
                    rows: items,
                    start_date: range && range.startISO(),
                    end_date: range && range.endISO(),
                    //sort by date if venue or any more specific info was given
                    order: (isVenue || range || category) ? EventRequestOrder.date : EventRequestOrder.popularity,
                    category_slug: category && category.resId
                } as EventRequest

                //request events list
                let events = await getEvents(req)
                    
                let categoryName = category && category.resId ? category.value : ""

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
                    speech.say("Please try again or change one of your filters")
                } else if(events.list.length == 1) {
                    EventSelectHandler.getSpeech(events.list[0], speech)
                } else {
                    if(items < events.count)
                        speech.pauseByStrength("strong").say("I'll read you the first").say(items.toString())

                    const refineRecommendCountKey = "refineRecommendCount"
                    // let refineRecommendCount = await input.getPersistentAttr(refineRecommendCountKey) as number || 0
                    let refineRecommendCount = 0

                    if((items < events.count) && refineRecommendCount < 5){
                        speech.pauseByStrength("strong")

                        //get list of categories (either root list or)
                        let catChildren = await getCategoryChildren(category && category.resId)

                        if(catChildren.length){
                            let reqClone = Object.assign({fields: "event:(id)"}, req)
                            reqClone.rows = 1
                            reqClone.fields = "event:(id)"

                            let eventsForCategory: {cat:CategoryInfo,count:number}[] = []

                            for (const cat of catChildren.sort((a,b) => b.count_current_events-a.count_current_events)) {
                                if(10 < eventsForCategory.length)
                                    break

                                reqClone.category_slug = cat.url_slug

                                let resp = await getEvents(reqClone)
                                if(resp.count)
                                    eventsForCategory.push({
                                        cat: cat,
                                        count: resp.count
                                    })
                            }

                            //if less than 0, a first
                            eventsForCategory = eventsForCategory.sort((a, b) => b.count-a.count)
                            // eventsForCategory.splice(5)
                            speech.say("The top categories you could use for this search are")
                                .say(eventsForCategory.map(catInfo => catInfo.cat.name).join(', '))
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
    
                            speech.say("You could refine your search now by interrupting and adjusting a filter").pauseByStrength("medium")
                                .say(`for example you can set the ${name} to ${suggestion} by saying, alexa set ${name} to ${suggestion}`)
                                .pauseByStrength("strong")
    
                            // speech.say("You could refine your search now by interrupting and adding a filter")
                            //     .say("such as").say(unadded.join(', '))
                        }

                        input.persistent.refineRecommendCount = refineRecommendCount+1
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

                console.log("SPEECH: " + speech.ssml())
                
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