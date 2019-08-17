import {writeFile, read, write} from 'fs'
import {join} from 'path'
import {promisify} from 'util'

//TODO: remove usage of alexa-app: errors
import utterances from './alexa-utterances'
import {getLocations, getVenues, VenueNode, getCategoryTree, eventFindaRequest, LocationNode} from '../lambda/src/lib/request'
import '../lambda/src/lib/ArrayExt'
import {Schema} from '../lambda/src/lib/Schema'
import { prettyJoin } from '../lambda/src/lib/Util';

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

const dictionary = {
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
    "searchPrefix": ["Tell me", "Find", "Find me", "Search for", "Request", "List", "Is there"],
    "eventsName": ["events", "shows", "concerts", "gigs", "productions"],
    "eventChoice": ["number", "option", "event", "choice"]
}

class Slot {
    samples = []

    constructor(readonly name: string, readonly type: string){

    }
}

class SlotValue {
    name: {value: string, synonyms?: string[]}
    constructor(public id: string, value: string, synonyms?: string[]){
        this.name = {
            synonyms: synonyms,
            value: value
        }
    }
}

class CustomSlot {
    public static readonly all: CustomSlot[] = [];

    name: string;

    constructor(slot: Slot, public values: SlotValue[]){
        this.name = slot.type

        console.log("SLOT: " + JSON.stringify(this, null, 2))

        CustomSlot.all.push(this)
    }
}

class Intent{
    public static readonly all: Intent[] = []

    constructor(public name: string, public samples?: string[], public slots?: Slot[]){
        //trim whitespace
        this.samples = (samples || []).flatMap(sample => utterances(sample, {}, dictionary)).map(sample => sample.replace(/\s{2,}/, " ").trim())
        this.slots = slots || []

        // console.log("INTENT: " + JSON.stringify(this, null, 2))

        //add to global list
        Intent.all.push(this)
    }
}

(async () => {
    const dateSlot = new Slot(Schema.DateSlot, "AMAZON.DATE");
    const timeSlot = new Slot(Schema.TimeSlot, "AMAZON.TIME");
    const categorySlot = new Slot(Schema.CategorySlot, "CategoryType");
    const locationSlot = new Slot(Schema.LocationSlot, "LocationType")
    const venueSlot = new Slot(Schema.VenueSlot, "VenueType")
    const numberSlot = new Slot(Schema.NumberSlot, "AMAZON.NUMBER")

    let eventsUtterances = [] as string[]

    //explores all combinations of these in the different synatatic locations. Will add categories here later. This can probably be connected to the places list in some way for simplicity
    let optionDetails = [`{-|${dateSlot.name}}`, `{-|${timeSlot.name}}`]

    //explores both types of place as well as no place (use home location)
    let placeTypes = [`at {-|${venueSlot.name}}`, `in {-|${locationSlot.name}}`]

    let preTexts = [
        "{whats} {happening}",
        "{searchPrefix} {findMeWhats} {happening}",
        // "{search {eventsName}",
        `{searchPrefix} {What |Any |The |}{-|${categorySlot.name}} {eventsName|} {happening|}`,
        `What {-|${categorySlot.name}} {eventsName} are {happening}`
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

    new Intent(Schema.EventsIntent, eventsUtterances, [venueSlot, locationSlot, dateSlot, timeSlot, categorySlot])

    let makeSetIntent = (setIntentName: string, slot: Slot, ...names: string[]) => {
        new Intent(setIntentName,
            names.flatMap(name => [
                `Set ${name} to {-|${slot.name}}`,
                `Set the ${name} to {-|${slot.name}}`,
                `${name} is {-|${slot.name}}`,
                `The ${name} is {-|${slot.name}}`,
                `Change ${name} to {-|${slot.name}}`,
                `Change the ${name} to {-|${slot.name}}`,
                `{-|${slot.name}}` ]),
            [slot])
    }

    makeSetIntent(Schema.SetIntents.Category, categorySlot, "Category")
    makeSetIntent(Schema.SetIntents.Date, dateSlot, "Date", "Day", "Week", "Month")
    makeSetIntent(Schema.SetIntents.Time, timeSlot, "Time")
    makeSetIntent(Schema.SetIntents.Venue, venueSlot, "Venue", "Bar", "")
    makeSetIntent(Schema.SetIntents.Location, locationSlot, "Location", "Home", "City", "Town")

    //builtin amazon intents
    new Intent(Schema.AMAZON.HelpIntent)
    new Intent(Schema.AMAZON.StopIntent)
    new Intent(Schema.AMAZON.CancelIntent)
    new Intent(Schema.AMAZON.YesIntent)

    new Intent(Schema.TutorialIntent, [
        "{|start the |open the |redo the }{|basic |intro }tutorial"
    ])

    new Intent(Schema.AMAZON.PreviousIntent, [
        "go back to {my|the} {results|bookmarks|list of results|search}",
        "{results|bookmarks|list of results}"
    ])

    new Intent(Schema.PreviousPageIntent, [
        "go back",
        "go back a page",
        "go to the previous page",
        "previous page",
        "previous"
    ])

    new Intent(Schema.NextPageIntent, [
        "go forwards",
        "go forwards a page",
        "go to the next page",
        "next page",
        "next",
        "forwards"
    ])

    new Intent(Schema.RESET, [
        "Reset database"
    ])

    new Intent(Schema.SKIPTUTORIAL, [
        "Skip tutorial"
    ])

    //TODO: should be more genreal than list bookmarks
    let bookmarkNames = ["save", "bookmark", "keep"]
    new Intent(Schema.BookmarkEventIntent, [
            "this event",
            "this for later",
            "this",
            "event",
            "for later"
        ].flatMap(utterance => bookmarkNames.map(prefix => prefix + " " + utterance))
            .concat(bookmarkNames)
    )

    let bookmarksListName = ["bookmarks", "bookmarked events", "saved events"]
    new Intent(Schema.ListBookmarksIntent, [
            "what are my",
            "show me my",
            "list my",
            "display my"
        ].flatMap(utterance => bookmarksListName.map(suffix => utterance + " " + suffix))
            .concat(bookmarksListName)
    )

    function makeDetailIntent(intent: string, ...nouns: string[]){
        new Intent(intent, nouns.map(noun => `{what is the|tell me the|read out the|} ${noun}`))
    }

    makeDetailIntent(Schema.DetailIntents.Phone, "phone", "number", "phone number", "telephone", "telephone number", "contact")
    makeDetailIntent(Schema.DetailIntents.Description, "description", "long description", "all the description", "full description")

    new Intent(Schema.SelectIntent, [
            "{Tell me|Describe|Explain}{| about| more about}{| eventChoice} {-|Number}",
            "{eventChoice} {-|Number}",
            "{-|Number}"
        ],
        [numberSlot]
    )

    //generate location custom slot
    let locations = await getLocations(3)
    console.log(`${locations.length} locations retrieved`)
    console.log(`${locations.filter(loc => loc.count_current_events !== 0).length} happenin' locations`)

    //TODO: customSlots
    new CustomSlot(locationSlot, locations.map(node => new SlotValue(node.url_slug, node.name)))
    
    await saveData("location-names", locations.map(node => node.name))

    //generate venue custom slot
    let venues: VenueNode[] = []
    
    let regions = (await eventFindaRequest<LocationNode>('locations', {
        fields: "location:(id,name,summary,url_slug,count_current_events,children)",
        levels: 2,
        rows: 1,
        venue: false,
        url_slug: "new-zealand"
    }))!.list[0].children!.children
    console.log(`${regions.length} region locations`)

    for(let location of regions) {
        let newVenues = (await getVenues(location.url_slug, 25))
        newVenues.push(...await getVenues(location.url_slug, 25, "popularity"))
        console.log(`${newVenues.length} venues in ${location.name}`)
        newVenues = newVenues.filter(venue => venue.count_current_events !== 0)
        newVenues = newVenues.filter((venue, i) => newVenues.findIndex(earlierVenue => earlierVenue.id === venue.id) === i)
        console.log(`${newVenues.length} valid venues in ${location.name}`)

        venues.push(...newVenues)
    }

    console.log(`\n${venues.length} total venues found`)

    new CustomSlot(venueSlot, venues.map(node => new SlotValue(
        node.url_slug,
        node.name,
        permutations(node.name)
    )))
    
    // await saveData("venue-names", venues.map(node => node.name))

    let rootCat = await getCategoryTree()

    let categorySlotValues: SlotValue[] = []

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
            mainCatTitle = prettyJoin(["music", "concerts"], "and")
        //art exhibitions
        } else if(mainCat.id === 11){
            mainCatSynonyms.push("art", mainCat.name)
            mainCatTitle = "art and exhibitions"
        }

        categorySlotValues.push(new SlotValue(
                mainCat.id.toString(),
                mainCatTitle,
                mainCatSynonyms
            ),
            ...mainCat.children!.children.map(subCat => {
                let subCatSynonyms = catNameToSynonyms(subCat.name)
                return new SlotValue(
                    subCat.id.toString(),
                    prettyJoin(subCatSynonyms, "and"),
    
                    //append main category name (jazz category has jazz music as a synonym)
                    subCatSynonyms.flatMap(
                        synonym => mainCatSynonyms.map(mainCatSynonym => synonym + " " + mainCatSynonym))
                )
            })
        )
    })

    console.log(categorySlotValues.length + " categories found")
    new CustomSlot(categorySlot, categorySlotValues)

    await saveData("category-names", categorySlotValues.map(slot => {return {title: slot.name.value, id: slot.id}}))

    await promisify(writeFile)(join("models", "en-AU.json"), JSON.stringify({
        interactionModel: {
            languageModel: {
                intents: Intent.all,
                types: CustomSlot.all,
                invocationName: Schema.INVOCATION
            }
        }
    }, null, 2))

    console.log("done")
})()