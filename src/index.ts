import utterance from 'alexa-utterances'
import * as request from 'request-promise-native'
import {writeFile} from 'fs'
import {join} from 'path'
import {promisify} from 'util'
import { dialog, app as alexaApp } from 'alexa-app'

async function eventFindaRequest(endpoint: string, query?: Object): Promise<any>{
    let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`
    let response =  await request.get(url, {
        auth: {
            user: "alexaevents",
            pass: "3pjmvv59cgqc"
        },
        qs: query
    })
    return JSON.parse(response)
}

interface LocationNode{
    name: string,
    children?: {children: LocationNode[]},
    id: number,
    url_slug: string
}

function flattenLocation(node: LocationNode, list?: LocationNode[]): LocationNode[] {
    if(!list)
        //exclude New Zealand from list
        list = []
    //exclude numbered zones
    else if(!/\d/.test(node.name))
        list.push(node)

    //add node children
    if(node.children)
        node.children.children.forEach(child => {
            flattenLocation(child, list)
        })

    return list
}

async function getLocationNames(): Promise<LocationNode[]>{
    return flattenLocation((await eventFindaRequest('locations', {
        fields: "location:(id,name,url_slug,count_current_events,children)",
        id: 574,
        levels: 3,
        venue: false
    })).locations[0] as LocationNode)
}

(async () => {
    let app = new alexaApp()

    let locations = await getLocationNames()

    app.dictionary = {
        "homeName": ["location","home","house","residence"]
    }

    app.invocationName = "the local"

    let locationTypeName = "LocationType"
    app.customSlot(locationTypeName, locations.map(node => {return{id:node.url_slug, value:node.name}}))

    app.intent("SetLocationIntent", {
        slots: { "Location": locationTypeName },
        utterances: [
            "{|I live |I am |I'm }in {-|Location}",
            "{|My }{homeName} {|is in |is |is at }{-|Location}",
            "Set {|my }{homeName} {|to |as }{-|Location}"
        ]
    })

    await promisify(writeFile)(join("models", "en-AU.json"), app.schemas.askcli())
})()