import * as request from 'request-promise-native'
import { TIMEOUT } from 'dns';

export async function eventFindaRequest(endpoint: string, query?: any): Promise<any>{
    let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`
    let response =  request.get(url, {
        auth: {
            user: "alexaevents",
            pass: "3pjmvv59cgqc"
        },
        qs: query
    })
    // console.log(endpoint + ": " + JSON.stringify(query))
    return JSON.parse(await response)
}

const rows = 20;
export async function eventFindaRequestMultiple<RetType>(endpoint: string, query?: any, maxRows?: number): Promise<RetType[]>{
    let row = 0;
    let returns = [] as RetType[]

    query = query || {}
    query.rows = rows

    let isMore = true
    while(isMore && (!maxRows || row < maxRows)){
        let cur = (await eventFindaRequest(endpoint, 
            Object.assign(query, {offset: row})))[endpoint] as RetType[]

        if(0 < cur.length){
            returns.push(...cur)
        } else
            isMore = false;

        row += rows;
    }
    return returns
}

export interface LocationNode{
    name: string,
    children?: {children: LocationNode[]},
    count_current_events: number,
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

    delete node.children
    node.name = node.name.toLowerCase()

    return list
}

export async function getLocations(levels?: number): Promise<LocationNode[]>{

    return flattenLocation((await eventFindaRequest('locations', {
        fields: "location:(id,name,url_slug,count_current_events,children)",
        levels: levels||4,
        venue: false
    })).locations[0] as LocationNode)
}

export interface VenueNode extends LocationNode{
    description: string,
    point: {
        lat: number,
        lng: number
    }
}

export async function getVenues(url_slug?: string): Promise<VenueNode[]>{
    let row = 0;

    let venues = await eventFindaRequestMultiple<VenueNode>('locations', {
        venue: true,
        rows: rows,
        offset: row,
        order: "popularity",
        fields: "location:(id,name,url_slug,count_current_events,description)",
        location_slug: url_slug
    }, 40)

    return venues
}