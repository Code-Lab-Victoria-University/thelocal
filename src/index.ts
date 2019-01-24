import * as request from 'request-promise-native'
import {writeFile} from 'fs'
import {join} from 'path'
import {promisify} from 'util'
import { dialog, app as alexaApp, CustomSlot, IntentSchema } from 'alexa-app'
import {getLocations, getVenues, VenueNode} from '../lambda/src/lib/request'
import {baseEqual} from '../lambda/src/lib/Util'

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


let locationTypeName = "LocationType"


export class Intents {
    [key: string]: IntentSchema

    VenueIntent = {
        slots: { "Venue": "VenueType" },
            utterances: [
                "{|Let me know |Tell me }{Is there anything on|Is there something happening|What's|What is|What's on|What can I go to|What is happening|What's happening} {in|at} {-|Venue}"
            ]
    }

    SetLocationIntent = {
        slots: { "Location": "LocationType" },
        utterances: [
            "{|I live |I am |I'm |I'm located }in {-|Location}",
            "{|My }{homeName} {|is in |is |is at }{-|Location}",
            "Set {|my }{homeName} {|to |as }{-|Location}"
        ]
    }

    YesIntent = {
        utterances: [
            "{Yes|Yep|Correct} {|thanks}",
        ]
    }

    NoIntent = {
        utterances: [
            "{No|Nope|Incorrect|False} {|thanks}",
        ]
    }
}

(async () => {
    let app = new alexaApp()

    let intents = new Intents()
    Object.keys(intents).forEach(intentName => {
        app.intent(intentName, intents[intentName])
    })

    app.dictionary = {
        "homeName": ["location","home","house","residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"]
    }

    app.invocationName = "the local"

    let locations = await getLocations()
    console.log(`${locations.length} locations retrieved`)

    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))

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