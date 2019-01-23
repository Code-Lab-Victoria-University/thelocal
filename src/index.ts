import * as request from 'request-promise-native'
import {writeFile} from 'fs'
import {join} from 'path'
import {promisify} from 'util'
import { dialog, app as alexaApp } from 'alexa-app'
import {getLocations, getVenues, VenueNode} from '../lambda/src/lib/request'

(async () => {
    let app = new alexaApp()

    app.dictionary = {
        "homeName": ["location","home","house","residence"],
        "thanks": ["Please", "Thanks", "Thank you", "Cheers"]
    }

    app.invocationName = "the local"

    let locations = await getLocations()
    console.log(`${locations.length} locations retrieved`)

    let locationTypeName = "LocationType"
    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))

    let venueTypeName = "VenueType"
    let venues = [] as VenueNode[]
    let topLocations = (await getLocations(2)).filter(loc => loc.count_current_events != 0)
    console.log(topLocations.length + " locations being used to find venues")
    for(let location of topLocations) {
        console.log(location.name)
        for(let checkVenue of await getVenues(location.url_slug)){
            if(!venues.some(goodVenue => goodVenue == checkVenue))
                venues.push(checkVenue)
        }
    }

    console.log(venues.length + " venues retrieved")

    //add synonyms without "the"

    app.customSlot(venueTypeName, venues.map(node => { return {id: node.url_slug, value: node.name} }))

    app.intent("VenueIntent", {
        slots: { "Venue": venueTypeName },
        utterances: [
            "{|Let me know |Tell me }{What's on|What can I go to|What's happening} at {-|Venue}",
        ]
    })

    app.intent("SetLocationIntent", {
        slots: { "Location": locationTypeName },
        utterances: [
            "{|I live |I am |I'm |I'm located }in {-|Location}",
            "{|My }{homeName} {|is in |is |is at }{-|Location}",
            "Set {|my }{homeName} {|to |as }{-|Location}"
        ]
    })

    app.intent("YesIntent", {
        utterances: [
            "{Yes|Yep|Correct} {|thanks}",
        ]
    })

    app.intent("NoIntent", {
        utterances: [
            "{No|Nope|Incorrect|False} {|thanks}",
        ]
    })

    await promisify(writeFile)(join("models", "en-AU.json"), app.schemas.askcli())
})()