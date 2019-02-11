import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate, { DateRange } from "../lib/AmazonDate";
import { Location } from "aws-sdk/clients/s3";
import AmazonTime from "../lib/AmazonTime";

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
                else if(timeSlot)
                    range = new AmazonTime(timeSlot.value)

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

                speech.pauseByStrength("strong")

                if(events.count === 0){
                    speech.say("Please try again or change one of your filters")
                } else {
                    const refineRecommendCountKey = "refineRecommendCount"
                    let refineRecommendCount = await input.getPersistentAttr(refineRecommendCountKey) as number || 0
                    // let refineRecommendCount = 0

                    if((items*3 < events.count) && refineRecommendCount < 5){
                        let [name, suggestion] = !dateSlot ? ["date", "next week"] :
                        !categoryName ? ["category", "folk music"] :
                        !isVenue ? ["venue", "city gallery"] :
                        !timeSlot ? ["time", "tonight"] :
                        ["more specific date", "this weekend"]

                        speech.say("I recommend refining your search filters by specifying a")
                            .say(`${name}, for example, say set ${name} to ${suggestion}`)
                            .pauseByStrength("strong")

                        input.setPersistentAttr(refineRecommendCountKey, refineRecommendCount+1)
                    }

                    speech.say("I'll read you the first").say(Math.min(events.count, events.list.length).toString()).pauseByStrength("strong")

                    speech.say("You can say your request at the end or interrupt me by saying Alexa")
                    
                    speech.pauseByStrength("x-strong")
                
                    events.list.forEach((event, i) => {
                        new AmazonDate(event.datetime_start).toSpeech(speech)
                        speech.say("I have").say(event.name).pauseByStrength("strong")
                        speech.say("for details say number").say((i+1).toString()).pauseByStrength("x-strong")
                    })

                    input.sessionAttrs.lastEvents = events
                }

                console.log("SPEECH: " + speech.ssml())
                
                return input.response
                    .speak(speech.ssml())
                    .reprompt("You can refine a search filter or start from scratch")
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