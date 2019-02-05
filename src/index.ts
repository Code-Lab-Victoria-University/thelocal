import {writeFile} from 'fs'
import {join} from 'path'
import {promisify} from 'util'

import { app as alexaApp, CustomSlot } from 'alexa-app'
import {getLocations, getVenues, VenueNode} from '../lambda/src/lib/request'
import {baseEqual} from '../lambda/src/lib/Util'
import {Schema} from '../lambda/src/lib/Schema'

function permutations(string: string): string[] {
    let strings = string.split(" ")
    let arr = [] as string[]
    for( let start = 0; start < strings.length; start++){
        for( let end = strings.length; start+1 < end; end--){
            if(end-start < strings.length)
                arr.push(strings.slice(start, end).join(" "))
        }
    }
    return arr
}

(async () => {
    let app = new alexaApp()

    app.invocationName = "the local"

    app.dictionary = {
        "homeName": ["location","home","house","residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"],
        "whatsOn": ["Is there anything on",
            "Is there something happening",
            "What's on",
            "What can I go to",
            "What is happening",
            "What's happening",
            "What events are on",
            "What events are happening",
            "events"
        ],
        "eventChoice": ["number", "option", "event", "choice"]
    }

    let eventsUtterances = [] as string[]

    //explores all combinations of these in the different synatatic locations. Will add categories here later. This can probably be connected to the places list in some way for simplicity
    let optionDetails = [`{-|${Schema.DateSlot}}`, `{-|${Schema.TimeSlot}}`]

    //explores both types of place as well as no place (use home location)
    let placeTypes = [`at {-|${Schema.VenueSlot}}`, `in {-|${Schema.LocationSlot}}`]

    function mix(values: string[]): string[]{
        if(values.length <= 1)
            return values
        else {
            let myVal = values.splice(0, 1)[0]
            let mixed = mix(values)
            // console.log(mixed)
            //combinations of single val and full mixed list
            return [myVal].concat(mixed.map(val => myVal+" "+val)).concat(mixed.map(val => val +" "+ myVal)).concat(mixed)
        }
    }

    let preTexts = [
        "{|Let me know |Tell me |Find }{whatsOn}",
        // `{|What} {-|${Schema.CategorySlot}} {events |shows |concerts |gigs |}{are on|are happening}`
    ]
    eventsUtterances.push(...preTexts)

    let mixes = [] as string[]
    //can't have both places in one request so don't use mixer
    for(let place of placeTypes){
        let optionMixes = mix(optionDetails.concat(place))

        mixes.push(...optionMixes
            .filter(val => !mixes.includes(val)))
    }

    for(let preText of preTexts){
        eventsUtterances.push(...mixes.map(mix => preText +" "+ mix))
    }

    // eventsUtterances.push(...mixes.map(mix => preTexts +" "+ mix).concat(mixes.map()))

    app.intent(Schema.EventsIntent, {
        slots: {
            [Schema.VenueSlot]: "VenueType",
            [Schema.LocationSlot]: "LocationType",
            [Schema.DateSlot]: "AMAZON.DATE",
            [Schema.TimeSlot]: "AMAZON.TIME",
            [Schema.CategorySlot]: "CategoryType"
        },
        utterances: eventsUtterances
    })

    // app.intent(Schema.SetLocationIntent, {
    //     slots: { [Schema.LocationSlot]: "LocationType" },
    //     utterances: [
    //         "{I live|I am|I'm|I'm located} in {-|Location}",
    //         "{|My }{homeName} {is in|is|is at} {-|Location}",
    //         "Set{| my} {homeName} {to|as} {-|Location}"
    //     ]
    // })
    let identityIntent = {slots: {}, utterances: []}
    app.intent("AMAZON.CancelIntent", identityIntent)
    app.intent("AMAZON.HelpIntent", identityIntent)
    app.intent("AMAZON.StopIntent", identityIntent)

    app.intent(Schema.OptionIntent, {
        slots: { [Schema.NumberSlot]: "AMAZON.NUMBER" },
        utterances: [
            "{Tell me|Describe|Explain}{| about| more about}{| eventChoice} {-|Number}",
            "{eventChoice} {-|Number}"
        ]
    })

    //remove edge whitespace (doesn't work on template syntax. Gotta override), replace multi space with single space
    for(let intent in app.intents){
        app.intents[intent].utterances = app.intents[intent].utterances
            .map(utterance => utterance.replace(/\s{2,}/, " ").trim())
    }

    //generate location custom slot
    let locations = await getLocations(3)
    console.log(`${locations.length} locations retrieved`)
    let locationTypeName = "LocationType"

    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))

    //generate venue custom slot
    let venueTypeName = "VenueType"
    let venues = [] as VenueNode[]
    let topLocations = (await getLocations(2)).filter(loc => loc.count_current_events != 0)
    console.log(topLocations.length + " locations being used to find venues")

    for(let location of topLocations) {
        let oldLength = venues.length
        for(let checkVenue of await getVenues(location.url_slug, 2)){
            if(!venues.some(goodVenue => baseEqual(goodVenue.url_slug,checkVenue.url_slug) || baseEqual(goodVenue.name,checkVenue.name)))
                venues.push(checkVenue)
        }
        console.log(location.name + ": " + (venues.length - oldLength))
    }
    console.log(venues.length + " venues retrieved")

    app.customSlot(venueTypeName, venues.map(node => {
        return {
            id: node.url_slug,
            value: node.name,
            synonyms: permutations(node.name).concat(node.summary)
        } as CustomSlot
    }))

    await promisify(writeFile)(join("models", "en-AU.json"), app.schemas.askcli())
})()