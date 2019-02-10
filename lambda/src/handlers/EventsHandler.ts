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

                const refineRecommendCountKey = "refineRecommendCount"
                let refineRecommendCount = await input.getPersistentAttr(refineRecommendCountKey) as number || 0

//TODO: here

                if(items*3 < events.count && refineRecommendCount < 3){
                    speech.pauseByStrength("strong")
                        .say("I recommend refining your search by specifying a")
                        .say(
                            categoryName ? "category" :
                                !isVenue ? "venue" :
                                !dateSlot ? "date" :
                                !timeSlot ? "time" :
                                "more specific date"
                        )
                    input.setPersistentAttr(refineRecommendCountKey, refineRecommendCount+1)
                }
                
                speech.pauseByStrength("x-strong")
                
                events.list.forEach((event, i) => {
                    new AmazonDate(event.datetime_start).toSpeech(speech)
                    speech.say("I have").say(event.name).pauseByStrength("strong")
                    speech.say("for details say number").say((i+1).toString()).pauseByStrength("x-strong")
                })

                console.log("SPEECH: " + speech.ssml())
    
                let responseBuilder = input.response
                    .speak(speech.ssml())
                if(0 < events.count){
                    responseBuilder.reprompt("You can list the next page, restate what you heard or choose one of the options to hear more")
                    input.sessionAttrs.lastEvents = events
                }
                return responseBuilder.getResponse()
            } else
                return input.response
                    .speak(`Sorry, I don't know anywhere called ${place.value}`)
                    // .reprompt('Try again, speaking clearly and slowly')
                    .getResponse()
        //no location provided
        } else
            return input.response
                .speak(`Please state a location in your question. I will remember your most frequent location.`)
                .getResponse()
    }
}