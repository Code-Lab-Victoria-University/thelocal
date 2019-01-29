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
            "What's",
            "What is",
            "What's on",
            "What can I go to",
            "What is happening",
            "What's happening"
        ]
    }

    let eventsUtterances = []

    //explores all combinations of these in the different synatatic locations. Will add categories here later. This can probably be connected to the places list in some way for simplicity
    let optionDetails = [`{-|${Schema.DateSlot}}`]

    //explores both types of place as well as no place (use home location)
    let placeTypes = [Schema.VenueSlot, Schema.LocationSlot, ""]

    for(let place of placeTypes){
        let placeText = place ? `{in|at} {-|${place}} ` : ""
        for(let detail1 of optionDetails.concat("")){
            for(let detail2 of (place ? optionDetails.concat("") : optionDetails).filter(detail2 => detail2 != detail1)){
                eventsUtterances
                    .push(`{|Let me know|Tell me} {whatsOn} ${detail1} ${placeText} ${detail2}`)
            }
        }
    }

    eventsUtterances.forEach(val => console.log(val))

    app.intent(Schema.EventsIntent, {
        slots: {
            [Schema.VenueSlot]: "VenueType",
            [Schema.LocationSlot]: "LocationType",
            [Schema.DateSlot]: "AMAZON.DATE"
        },
        utterances: eventsUtterances
    })

    app.intent(Schema.SetLocationIntent, {
        slots: { [Schema.LocationSlot]: "LocationType" },
        utterances: [
            "{I live|I am|I'm|I'm located} in {-|Location}",
            "{|My }{homeName} {is in|is|is at} {-|Location}",
            "Set {|my }{homeName} {to|as} {-|Location}"
        ]
    })

    app.intent(Schema.YesIntent, {
        utterances: [
            "{Yes|Yep|Correct} {|thanks|thank you}",
        ]
    })

    app.intent(Schema.NoIntent, {
        utterances: [
            "{No|Nope|Incorrect|False} {|thanks|thank you}",
        ]
    })

    //remove edge whitespace (doesn't work on template syntax. Gotta override), replace multi space with single space
    for(let intent in app.intents){
        app.intents[intent].utterances = app.intents[intent].utterances
            .map(utterance => utterance.replace(/\s{2,}/, " ").trim())
    }

    //generate location custom slot
    let locations = await getLocations()
    console.log(`${locations.length} locations retrieved`)
    let locationTypeName = "LocationType"

    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))

    //generate venue custom slot
    let venueTypeName = "VenueType"
    let venues = [] as VenueNode[]
    let topLocations = (await getLocations(2)).filter(loc => loc.count_current_events != 0)
    console.log(topLocations.length + " locations being used to find venues")

    for(let location of topLocations) {
        console.log(location.name)
        for(let checkVenue of await getVenues(location.url_slug)){
            if(!venues.some(goodVenue => baseEqual(goodVenue.url_slug,checkVenue.url_slug) || baseEqual(goodVenue.name,checkVenue.name)))
                venues.push(checkVenue)
        }
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