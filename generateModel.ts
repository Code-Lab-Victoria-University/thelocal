import {writeFile, read, write} from 'fs'
import {join} from 'path'
import {promisify} from 'util'

import { app as alexaApp, CustomSlot } from 'alexa-app'
import {getLocations, getVenues, VenueNode, getCategoryTree, eventFindaRequest, LocationNode} from './lambda/src/lib/request'
import './lambda/src/lib/ArrayExt'
import {Schema} from './lambda/src/lib/Schema'
import { prettyJoin } from './lambda/src/lib/Util';

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

/**
 * 
 * @param name .json suffix will be added
 * @param saveObj object to be stringified
 */
async function saveData(name: string, saveObj: any) {
    await promisify(writeFile)(join("lambda", "src", "data", name+".json"), JSON.stringify(saveObj))
}

(async () => {

    let app = new alexaApp()

    const venueTypeName = "VenueType"
    const locationTypeName = "LocationType"
    const categoryTypeName = "CategoryType"
    const dateTypeName = "AMAZON.DATE"
    const timeTypeName = "AMAZON.TIME"

    app.invocationName = "the local"

    app.dictionary = {
        "homeName": ["location","home","house","residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"],
        "whats": [
            "What's", 
            "What is", 
            "What events are", 
            "are there events",
        ],
        "findMeWhats": [
            "anything", 
            // "anything that is", 
            // "anything thats",
            "the events" ,
            "any events" ,
            // "the events that are", 
            // "any events that are", 
            "events" ,
            // "events that are", 
        ],
        "happening": ["on", "happening", "playing"],
        "search": ["Tell me", "Find", "Find me", "Search for", "Request", "List", "Is there"],
        "eventsName": ["events", "shows", "concerts", "gigs", "productions"],
        "eventChoice": ["number", "option", "event", "choice"]
    }

    let eventsUtterances = [] as string[]

    //explores all combinations of these in the different synatatic locations. Will add categories here later. This can probably be connected to the places list in some way for simplicity
    let optionDetails = [`{-|${Schema.DateSlot}}`, `{-|${Schema.TimeSlot}}`]

    //explores both types of place as well as no place (use home location)
    let placeTypes = [`at {-|${Schema.VenueSlot}}`, `in {-|${Schema.LocationSlot}}`]

    let preTexts = [
        "{whats} {happening}",
        "{search} {findMeWhats} {happening}",
        // "{search {eventsName}",
        `{search} {What |Any |The |}{-|${Schema.CategorySlot}} {eventsName|} {happening|}`,
        `What {-|${Schema.CategorySlot}} {eventsName} are {happening}`
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
        eventsUtterances.push(...mixes.map(mix => preText+" "+ mix))
    }

    // eventsUtterances.push(...mixes.map(mix => preTexts +" "+ mix).concat(mixes.map()))

    app.intent(Schema.EventsIntent, {
        slots: {
            [Schema.VenueSlot]: venueTypeName,
            [Schema.LocationSlot]: locationTypeName,
            [Schema.DateSlot]: dateTypeName,
            [Schema.TimeSlot]: timeTypeName,
            [Schema.CategorySlot]: categoryTypeName
        },
        utterances: eventsUtterances
    })

    let makeSetIntent = (setIntentName: string, slot: string, slotType: string, ...names: string[]) => {
        app.intent(setIntentName, {
            slots: {[slot]: slotType},
            utterances: names.flatMap(name => [
                `Set ${name} to {-|${slot}}`,
                `Set the ${name} to {-|${slot}}`,
                `${name} is {-|${slot}}`,
                `The ${name} is {-|${slot}}`,
                `Change ${name} to {-|${slot}}`,
                `Change the ${name} to {-|${slot}}`,
                `{-|${slot}}`
            ])
        })
    }

    makeSetIntent(Schema.SetIntents.Category, Schema.CategorySlot, categoryTypeName, "Category")
    makeSetIntent(Schema.SetIntents.Date, Schema.DateSlot, dateTypeName, "Date", "Day", "Week", "Month")
    makeSetIntent(Schema.SetIntents.Time, Schema.TimeSlot, timeTypeName, "Time")
    makeSetIntent(Schema.SetIntents.Venue, Schema.VenueSlot, venueTypeName, "Venue", "Bar", "")
    makeSetIntent(Schema.SetIntents.Location, Schema.LocationSlot, locationTypeName, "Location", "Home", "City", "Town")

    //builtin amazon intents
    let identityIntent = {utterances: []}
    app.intent("AMAZON.CancelIntent", identityIntent)
    app.intent("AMAZON.HelpIntent", identityIntent)
    app.intent("AMAZON.StopIntent", identityIntent)
    app.intent("AMAZON.YesIntent", identityIntent)

    app.intent("AMAZON.PreviousIntent", {
        utterances: [
            "go back to {my|the} {results|bookmarks|list of results|search}"
        ]
    })

    //TODO: should be more genreal than list bookmarks
    let bookmarkNames = ["save", "bookmark", "keep"]
    app.intent(Schema.BookmarkEventIntent, {
        utterances: [
            "this event",
            "this for later",
            "this",
            "event",
            "for later"
        ].flatMap(utterance => bookmarkNames.map(prefix => prefix + " " + utterance))
        .concat(bookmarkNames)
    })

    let bookmarksListName = ["bookmarks", "bookmarked events", "saved events"]
    app.intent(Schema.ListBookmarksIntent, {
        utterances: [
            "what are my",
            "show me my",
            "list my",
            "display my"
        ].flatMap(utterance => bookmarksListName.map(suffix => utterance + " " + suffix))
        .concat(bookmarksListName)
    })

    app.intent(Schema.RESET, {
        utterances: [
            "Reset database"
        ]
    })

    function makeDetailIntent(intent: string, ...nouns: string[]){
        app.intent(intent, {
            utterances: nouns.map(noun => `{what is the|tell me the|read out the|} ${noun}`)
        })
    }

    makeDetailIntent(Schema.DetailIntents.Phone, "phone", "number", "phone number", "telephone", "telephone number", "contact")
    makeDetailIntent(Schema.DetailIntents.Description, "description", "long description", "all the description", "full description")

    app.intent(Schema.SelectIntent, {
        slots: { [Schema.NumberSlot]: "AMAZON.NUMBER" },
        utterances: [
            "{Tell me|Describe|Explain}{| about| more about}{| eventChoice} {-|Number}",
            "{eventChoice} {-|Number}",
            "{-|Number}"
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
    
    await saveData("location-names", locations.map(node => node.name))

    //generate venue custom slot
    let venues: VenueNode[] = []
    // let topLocations = (await getLocations(2)).filter(loc => loc.count_current_events != 0)
    // console.log(topLocations.length + " locations being used to find venues")

    
    let regions = (await eventFindaRequest<LocationNode>('locations', {
        fields: "location:(id,name,summary,url_slug,count_current_events,children)",
        levels: 2,
        rows: 1,
        venue: false,
        url_slug: "new-zealand"
    }))!.list[0].children!.children
    console.log(`${regions.length} region locations`)

    for(let location of regions) {
        let newVenues = (await getVenues(location.url_slug, 20))
        newVenues.push(...await getVenues(location.url_slug, 20, "popularity"))
        console.log(`${newVenues.length} venues in ${location.name}`)
        newVenues = newVenues.filter(venue => venue.count_current_events !== 0)
        newVenues = newVenues.filter((venue, i) => newVenues.findIndex(earlierVenue => earlierVenue.id === venue.id) === i)
        console.log(`${newVenues.length} valid venues in ${location.name}`)

        venues.push(...newVenues)
    }

    console.log(`\n${venues.length} total venues found`)

    // let venues = await getVenues(undefined, 500)
    // console.log(Object.keys(venues).length + " venues retrieved")

    //remove all venues with 0 events for brevity
    // venues = venues.filter(val => val.count_current_events !== 0)
    // console.log(venues.length + " venues with events")
    // //only keep first appearance of venueId
    // venues = venues.filter((venue, i) => venues.findIndex(earlierVenue => earlierVenue.id === venue.id) === i)
    // console.log(venues.length + " unique venues (final)")

    app.customSlot(venueTypeName, venues.map(node => {
        return {
            id: node.url_slug,
            value: node.name,
            synonyms: permutations(node.name)//.concat(node.summary)
        } as CustomSlot
    }))
    
    // await saveData("venue-names", venues.map(node => node.name))

    let rootCat = await getCategoryTree()

    let categorySlots: CustomSlot[] = []

    //expands multiple words out of comma, ampersand separation
    let catNameToSynonyms = (name: string) => name.split(", ").flatMap(val => val.split(" & "))

    //gotta use category id instead of slug due to damn lawn bowls using a space in the slug...
    //I was tempted to remove lawn bowls but I gotta think about the target audience haha
    rootCat.children!.children.forEach(mainCat => {
        let mainCatSynonyms = catNameToSynonyms(mainCat.name)
        let mainCatTitle = prettyJoin(mainCatSynonyms, "and")

        //concerts and gig guide
        if(mainCat.id === 6){
            mainCatSynonyms.push("music", "concert", "gigs", mainCatTitle)
            mainCatTitle = "music and concerts"
        //art exhibitions
        } else if(mainCat.id === 11){
            mainCatSynonyms.push("art", mainCat.name)
            mainCatTitle = "art and exhibitions"
        }

        categorySlots.push({
            id: mainCat.id.toString(),
            value: mainCatTitle,
            synonyms: mainCatSynonyms
        })

        categorySlots.push(...mainCat.children!.children.map(subCat => {
            let subCatSynonyms = catNameToSynonyms(subCat.name)
            return {
                id: subCat.id.toString(),
                value: prettyJoin(subCatSynonyms, "and"),

                //append main category name (jazz category has jazz music as a synonym)
                synonyms: subCatSynonyms.flatMap(
                    synonym => mainCatSynonyms.map(mainCatSynonym => synonym + " " + mainCatSynonym))
            }
        }))
    })

    console.log(categorySlots.length + " categories found")
    app.customSlot(categoryTypeName, categorySlots)

    await saveData("category-names", categorySlots.map(slot => {return {title: slot.value, id: slot.id}}))

    await promisify(writeFile)(join("models", "en-AU.json"), app.schemas.askcli())
})()