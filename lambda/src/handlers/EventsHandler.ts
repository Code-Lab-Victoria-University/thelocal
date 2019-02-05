import { HandlerInput, RequestHandler } from "ask-sdk-core";
import InputWrap, { CustomSlot } from "../lib/InputWrap"
import {getEvents, EventRequestOrder, EventRequest, Response, Event} from '../lib/request'
import {Schema} from '../lib/Schema'
import AmazonSpeech from 'ssml-builder/amazon_speech'
import AmazonDate, { DateRange } from "../lib/AmazonDate";
import { Location } from "aws-sdk/clients/s3";
import AmazonTime from "../lib/AmazonTime";

//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html

const lastEventsKey = "lastEvents"
export {lastEventsKey}

interface OldLocations{
    [slug: string]: LocationFrequency
}

interface LocationFrequency {
    frequency: number,
    place: CustomSlot,
    isVenue: boolean
}
let prevLocationsKey = "prevLocations"

export class EventsHandler implements RequestHandler {
    canHandle(input: HandlerInput) {
        let wrap = new InputWrap(input);

        return wrap.isIntent(Schema.EventsIntent)
    }
    
    async handle(input: HandlerInput) {
        let wrap = new InputWrap(input)

        //is correct intent and has slots, else error
        if(wrap.isIntent(Schema.EventsIntent)){
            //check for venue (more specific) first
            let venueSlot = wrap.slots[Schema.VenueSlot]
            //venue must have resolution id (location slug)
            let isVenue = venueSlot !== undefined && venueSlot.resId !== undefined

            let place = isVenue ? venueSlot : wrap.slots[Schema.LocationSlot]

            let prevLocations = await wrap.getPresistentArr<OldLocations>(prevLocationsKey) || {}

            //if no place from venue or location, load from most recent location used
            if((!place || !place.resId) && prevLocations && Object.keys(prevLocations).length){
                //replace best place no best or if best is venue and new isn't or if both are equally venuey and new is higher frequency
                let bestOldLocation = Object.values(prevLocations).reduce((prev, cur) => 
                    !prev || cur.isVenue < prev.isVenue || (prev.isVenue == cur.isVenue && prev.frequency < cur.frequency) ? cur : prev)
                if(bestOldLocation){
                    place = bestOldLocation.place
                    isVenue = bestOldLocation.isVenue
                }
            }
            
            //if finally has a place, else tell the user to say a location and give hint
            if(place){
                //verify place is real, else tell user
                if(place.resId && place.resValue){
                    let slug = place.resId
                    let placeName = place.resValue

                    prevLocations[slug] = prevLocations[slug] || {
                        frequency: 0,
                        place: place,
                        isVenue: isVenue
                    }
                    prevLocations[slug].frequency += 1

                    //save the last used location in case the user doesn't use a location in future requests
                    if(!isVenue)
                        wrap.setPersistentAttr<OldLocations>(prevLocationsKey, prevLocations)

                    //start request object for api request
                    let req = {
                        location_slug: slug,
                        rows: 3,
                        //sort by date if venue, by popularity if location
                        order: isVenue ? EventRequestOrder.date : EventRequestOrder.popularity
                    } as EventRequest

                    //parse date
                    let dateSlot = wrap.slots[Schema.DateSlot]
                    let timeSlot = wrap.slots[Schema.TimeSlot]
                    let range: DateRange|undefined = undefined
                    if(dateSlot)
                        range = new AmazonDate(dateSlot.value)
                    else if(timeSlot)
                        range = new AmazonTime(timeSlot.value)

                    if(range){
                        //load start/end values into request
                        req.start_date = range.startISO()
                        req.end_date = range.endISO()
                        console.log(JSON.stringify(range))
                    }

                    //request events list
                    let events = await getEvents(req)

                    //compile response
                    let speech = new AmazonSpeech()
                    if(events.count == 0)
                        speech.say("I couldn't find any events")
                    else
                        speech.say("I found").say(events.count.toString())
                            .say(events.count == 1 ? "event" : "events")
                    
                    speech.say((isVenue ? "at " : "in ") + placeName)

                    if(range)
                        range.toSpeech(speech)
                    
                    speech.pauseByStrength("x-strong")
                    
                    events.list.forEach((event, i) => 
                        speech.say("For").say(event.name)
                            .say("say number").say((i+1).toString()).pauseByStrength("x-strong"))

                    console.log("SPEECH: " + speech.ssml())
        
                    let responseBuilder = input.responseBuilder
                        .speak(speech.ssml())
                    if(0 < events.count){
                        responseBuilder.reprompt("You can list the next page, restate what you heard or choose one of the options to hear more")
                        wrap.sessionAttrs[lastEventsKey] = events
                    }
                    return responseBuilder.getResponse()
                } else
                    return input.responseBuilder
                        .speak(`Sorry, I don't know anywhere called ${place.value}`)
                        // .reprompt('Try again, speaking clearly and slowly')
                        .getResponse()
            //no location provided
            } else
                return input.responseBuilder
                    .speak(`Please state a location in your question. I will remember your most frequent location.`)
                    .getResponse()
        } else{
            throw new Error("VenueHandler Error: " + JSON.stringify(wrap));
        }
    }
}