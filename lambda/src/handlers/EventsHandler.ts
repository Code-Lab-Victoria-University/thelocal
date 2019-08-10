import AmazonSpeech from 'ssml-builder/amazon_speech';
import { DateRange } from "../lib/DateRange";
import InputWrap, { CustomSlot } from "../lib/InputWrap";
import { CategoryInfo, EventRequest, EventRequestOrder, getCategoryChildren, getEvents, maxParallelRequests } from '../lib/request';
import { Schema } from '../lib/Schema';
import { SpokenDateTime } from "../lib/SpokenDateTime";
import { getCategoryName, prettyJoin } from "../lib/Util";
import { EventSelectHandler } from "./EventSelectHandler";
import { AutoNavigationHandler } from "./NavigationHandler";

//TODO: https://developer.amazon.com/docs/alexa-design/voice-experience.html

export interface OldLocations{
    [slug: string]: LocationFrequency
}

interface LocationFrequency {
    frequency: number,
    place: CustomSlot
}

//TODO: only trigger recommendation on multiple pages (3)
export const items = 4

const backIntents = [Schema.PreviousPageIntent, Schema.AMAZON.PreviousIntent]
const nextIntents = [Schema.AMAZON.YesIntent, Schema.NextPageIntent]

export class EventsHandler extends AutoNavigationHandler {
    intent = Object.values(Schema.SetIntents).concat(Schema.EventsIntent, ...backIntents, ...nextIntents)

    canWrap(input: InputWrap){
        //will only accept if the right info exists for pagination requests
        return !input.isIntent(backIntents.concat(nextIntents)) || input.session.lastEventsRequest !== undefined
    }

    async handleWrap(input: InputWrap){
        //any request that isn't a strict EventsIntent should overwrite slots with lastSlots
        if(!input.isIntent(Schema.EventsIntent) && input.session.lastEventsSlots !== undefined)
            input.slots = Object.assign(input.session.lastEventsSlots, input.slots)

        input.session.lastEventsSlots = input.slots

        if(input.session.eventRequestPage === undefined || input.isIntent(Schema.EventsIntent))
            input.session.eventRequestPage = 0
        
        //only change page if requested before and wasn't redirected (PreviousPageIntent is real)
        if(input.session.lastEventsRequest !== undefined && input.previousRedirect === undefined)
            if(input.isIntent(nextIntents))
                input.session.eventRequestPage++
            else if(input.isIntent(backIntents))
                input.session.eventRequestPage = Math.max(input.session.eventRequestPage-1, 0)

        
        //check for venue (more specific) first
        let venueSlot = input.slots[Schema.VenueSlot]
        //venue must have resolution id (location slug)
        let isVenue = venueSlot !== undefined && venueSlot.resId !== undefined

        let place = isVenue ? venueSlot : input.slots[Schema.LocationSlot]

        //if no place from venue or location, load from most recent location used
        if((!place || !place.resId)){
            let topLocation = input.getTopLocation()
            if(topLocation)
                place = topLocation
        }
        
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

                let date = new SpokenDateTime(dateSlot && dateSlot.value, timeSlot && timeSlot.value)

                let category = input.slots[Schema.CategorySlot]
                let categoryId = category && category.resId ? Number.parseInt(category.resId) : undefined

                //start request object for api request
                let req = {
                    location_slug: slug,
                    rows: items,
                    start_date: date && date.start().toISOString(true),
                    end_date: date && date.end().toISOString(true),
                    //sort by date if venue or any more specific info was given
                    //TODO: make it display days running for short time first
                    order: (isVenue || date || category) ? EventRequestOrder.date : EventRequestOrder.popularity,
                    category: categoryId,
                    offset: input.session.eventRequestPage*items
                } as EventRequest

                //request events list
                let events = await getEvents(req)
                //go back a page if no entries
                while(events.list.length === 0 && input.session.eventRequestPage){
                    console.log("NO EVENTS ON PAGE: " + input.session.eventRequestPage)
                    input.session.eventRequestPage = Math.max(input.session.eventRequestPage-1, 0)
                    events = await getEvents(req)
                }
                
                let categoryName = getCategoryName(categoryId)

                //compile response
                let speech = new AmazonSpeech()

                if(input.isIntent(backIntents.concat(nextIntents)) || 0 < input.session.eventRequestPage)
                    speech.sayAs({interpret: "ordinal", word: `${input.session.eventRequestPage+1} page`}).pauseByStrength("x-strong")

                if(events.count == 0)
                    speech.say(`I couldn't find any ${categoryName} events`)
                else
                    speech.say("I found").say(events.count.toString())
                        .say(categoryName).say(events.count == 1 ? "event" : "events")
                
                speech.say((isVenue ? "at " : "in ") + placeName)

                if(date)
                    date.toSpeech(speech)

                if(events.count === 0){
                    speech.pauseByStrength("strong")
                    speech.say("Please try again or change one of your filters")
                } else if(events.list.length == 1) {
                    speech.pauseByStrength("strong")
                    EventSelectHandler.getEventDetails(events.list[0], speech)
                } else {
                    //recommend filters
                    if(items*3 < events.count && input.session.eventRequestPage === 0){
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
                                
                            //if less than 0, a first
                            catCounts = catCounts.sort((a, b) => b.count-a.count)
                            catCounts.splice(5)

                            //TODO: look for extraneous gap inside cat name
                            let catInfos = catCounts.map(catInfo => catInfo.count.toString() + " in " + getCategoryName(catInfo.cat.id))

                            speech.pauseByStrength("medium")
                                .say("They fall into the following categories")
                                .pauseByStrength("medium")
                                .say(prettyJoin(catInfos, "or", true))
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
                        let eventRange = new DateRange(event, date.start(), date.end())
                        if(!isVenue)
                            speech.say('At').say(event.location.name)
                            
                        speech.say("I have").say(event.name).say("on")
                        eventRange.toSpeech(speech)

                        speech.pauseByStrength("medium").say("for details say number")
                        .say((i+1).toString()).pauseByStrength("x-strong")
                    })

                    input.session.lastEventsRequest = events
                }

                let reprompt = `You can ${1 < events.list.length ? `choose one of the ${events.list.length} events, ` : ""}
                adjust this request, make a new request
                ${0 < input.session.eventRequestPage ? ", go to the previous page" : ""}
                or would you like me to read out the next page of results?`
                
                speech.sentence(reprompt)
                
                return input.response
                    .speak(speech.ssml())
                    .reprompt(reprompt)
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