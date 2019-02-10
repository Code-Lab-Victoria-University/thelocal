import {writeFile, read, write} from 'fs'
import {join} from 'path'
import {promisify} from 'util'

import { app as alexaApp, CustomSlot } from 'alexa-app'
import {getLocations, getVenues, VenueNode, getCategories} from '../lambda/src/lib/request'
import {baseEqual, flatMap} from '../lambda/src/lib/Util'
import {Schema} from '../lambda/src/lib/Schema'

/**
 * returns all ordered, touching sentense permuatations of length at least 2 excluding original. eg "a1 a2 a3" = ["a1 a2", "a2 a3"]
 * @param string 
 */
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

/**
 * Mixes values into all possible orders [1,2,3] = [1, 12, 123, 122, 132, 312, 31s etc]
 * @param values 
 */
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

(async () => {

    let app = new alexaApp()

    let venueTypeName = "VenueType"
    let locationTypeName = "LocationType"
    let categoryTypeName = "CategoryType"

    app.invocationName = "the local"

    app.dictionary = {
        "homeName": ["location","home","house","residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"],
        "whats": [
            "What's", 
            "What is", 
            "What events are", 
            "Is there",

            "events" ,
            "events that are", 
            "are there events",
            "the events that are", 
            "any events that are", 

            "the events" ,
            "any events" ,
            "is there any events" ,
            "is there any events that are", 

            "anything", 
            "anything that is", 
            "anything thats",
            "is there anything",
            "is there anything that is",
            "is there anything thats"
        ],
        "happening": ["on", "happening", "playing"],
        "search": ["Let me know", "Tell me", "Find", "Find me", "Search for", "Search", "Request", "List"],
        "eventsName": ["events", "shows", "concerts", "gigs", "productions"],
        "eventChoice": ["number", "option", "event", "choice"]
    }

    let eventsUtterances = [] as string[]

    //explores all combinations of these in the different synatatic locations. Will add categories here later. This can probably be connected to the places list in some way for simplicity
    let optionDetails = [`{-|${Schema.DateSlot}}`, `{-|${Schema.TimeSlot}}`]

    //explores both types of place as well as no place (use home location)
    let placeTypes = [`at {-|${Schema.VenueSlot}}`, `in {-|${Schema.LocationSlot}}`]

    let preTexts = [
        "{|search }{what} {happening}",
        `{|search }{What |Any |The |}{-|${Schema.CategorySlot}} {eventsName|} {happening|}`,
        // `{|search} {-|${Schema.CategorySlot}} {eventsName|} {happening}`,
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
            [Schema.VenueSlot]: venueTypeName,
            [Schema.LocationSlot]: locationTypeName,
            [Schema.DateSlot]: "AMAZON.DATE",
            [Schema.TimeSlot]: "AMAZON.TIME",
            [Schema.CategorySlot]: categoryTypeName
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

    //remove edge whitespace (doesn't work on template syntax. TODO: work on template syntax underneath), replace multi space with single space
    for(let intent in app.intents){
        app.intents[intent].utterances = app.intents[intent].utterances
            .map(utterance => utterance.replace(/\s{2,}/, " ").trim())
    }

    //generate location custom slot
    let locations = await getLocations(3)
    console.log(`${locations.length} locations retrieved`)
    console.log(`${locations.filter(loc => loc.count_current_events !== 0).length} happenin' locations`)

    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))


    //generate venue custom slot
    // let venues = {} as {[key: string]: VenueNode}
    // let topLocations = (await getLocations(2)).filter(loc => loc.count_current_events != 0)
    // console.log(topLocations.length + " locations being used to find venues")


    // for(let location of topLocations) {
    //     let topVenues = await getVenues(location.url_slug, 8)
    //     topVenues.forEach(val => venues[val.id] = val)
    //     console.log(location.name + ": " + topVenues.length)
    // }
    let venues = await getVenues(undefined, 100)
    console.log(Object.keys(venues).length + " venues retrieved")

    venues = venues.filter(val => val.count_current_events !== 0)
    console.log(venues.length + " valid venues")

    app.customSlot(venueTypeName, venues.map(node => {
        return {
            id: node.url_slug,
            value: node.name,
            synonyms: permutations(node.name).concat(node.summary)
        } as CustomSlot
    }))

    let categories = await getCategories()
    console.log(categories.length + " categories found")
    app.customSlot(categoryTypeName, categories.map(node => {
        return {
            id: node.url_slug,
            value: node.name,
            synonyms: flatMap(node.name.split(", "), val => val.split(" & "))
        } as CustomSlot
    }))
    await promisify(writeFile)(join("lambda", "data", "category-names.json"), JSON.stringify(categories.map(node => node.name)))

    await promisify(writeFile)(join("models", "en-AU.json"), app.schemas.askcli())
})()