import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate from "../lib/AmazonDate";
import AmazonTime from "../lib/AmazonTime";
import { EventSelectHandler } from "./EventSelectHandler";
import DateRange from "../lib/DateRange";
import moment from 'moment-timezone'

//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html

interface OldLocations{
    [slug: string]: LocationFrequency
}

interface LocationFrequency {
    frequency: number,
    place: CustomSlot
}
let prevLocationsKey = "prevLocations"

let items = 4

export class EventsHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        return wrap.isIntent(Object.values(Schema.SetIntents).concat(Schema.EventsIntent))
    }

    async handle(input: HandlerInput){
        return this.handleWrap(new InputWrap(input))
    }
    
    async handleWrap(input: InputWrap) {
        //check for venue (more specific) first
        let venueSlot = input.slots[Schema.VenueSlot]
        //venue must have resolution id (location slug)
        let isVenue = venueSlot !== undefined && venueSlot.resId !== undefined

        let place = isVenue ? venueSlot : input.slots[Schema.LocationSlot]

        let prevLocations = await input.getPersistentAttr<OldLocations>(prevLocationsKey) || {}

        //save this request in case user wants to set parameters
        input.sessionAttrs.lastSlots = input.slots

        //if no place from venue or location, load from most recent location used
        if((!place || !place.resId) && Object.keys(prevLocations).length){
            //replace best place no best or if best is venue and new isn't or if both are equally venuey and new is higher frequency
            let bestOldLocation = Object.values(prevLocations).reduce((prev, cur) => 
                (!prev || prev.frequency < cur.frequency) ? cur : prev)

            if(bestOldLocation){
                place = bestOldLocation.place
                isVenue = false
            }
        }
        
        //if finally has a place, else tell the user to say a location and give hint
        if(place){
            //verify place is real, else tell user
            if(place.resId && place.resValue){
                let slug = place.resId
                let placeName = place.resValue

                //save the last used location in case the user doesn't use a location in future requests
                if(!isVenue){
                    prevLocations[slug] = prevLocations[slug] || {
                        frequency: 0,
                        place: place
                    }
                    prevLocations[slug].frequency += 1
                    input.setPersistentAttr<OldLocations>(prevLocationsKey, prevLocations)
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
                    speech.pauseByStrength("strong").say("I'll read you the first").say(Math.min(events.count, events.list.length).toString())
                        .pauseByStrength("strong")

                    const refineRecommendCountKey = "refineRecommendCount"
                    // let refineRecommendCount = await input.getPersistentAttr(refineRecommendCountKey) as number || 0
                    let refineRecommendCount = 0

                    if((items < events.count) && refineRecommendCount < 5){
                        let [name, suggestion] = !dateSlot ? ["date", "next week"] :
                            !categoryName ? ["category", "alternative music"] :
                            !isVenue ? ["venue", "city gallery"] :
                            !timeSlot ? ["time", "tonight"] :
                            ["more specific date", "this weekend"]

                        // let unadded = []
                        // if(!categoryName) unadded.push('event type')
                        // if(!isVenue) unadded.push('venue')
                        // if(!dateSlot) unadded.push('date')
                        // if(!timeSlot) unadded.push('time')

                        speech.say("You could refine your search now by interrupting and adding a filter").pauseByStrength("medium")
                            .say(`for example you can set the ${name} to ${suggestion} by saying, alexa set ${name} to ${suggestion}`)
                            .pauseByStrength("strong")

                        // speech.say("You could refine your search now by interrupting and adding a filter")
                        //     .say("such as").say(unadded.join(', '))

                        input.setPersistentAttr(refineRecommendCountKey, refineRecommendCount+1)
                    }

                    speech.pause('1s')
                
                    events.list.forEach((event, i) => {
                        let startDate = new AmazonDate(event.datetime_start, event.datetime_end)
                        if(!isVenue)
                            speech.say('At').say(event.location.name)
                            
                        speech.say("I have").say(event.name)
                        startDate.toSpeech(speech, true)

                        speech.pauseByStrength("medium").say("for details say number")
                        .say((i+1).toString()).pauseByStrength("x-strong")
                    })

                    input.sessionAttrs.lastEvents = events

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