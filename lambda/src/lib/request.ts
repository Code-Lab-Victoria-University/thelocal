import * as request from 'request-promise-native'
import { isLambda } from './Util';

export async function eventFindaRequest<RetType>(endpoint: string, query?: any): Promise<Response<RetType>>{
    let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`
    let req =  request.get(url, {
        auth: {
            user: "alexaevents",
            pass: "3pjmvv59cgqc"
        },
        qs: query
    })
    let ret = {} as Response<RetType>
    
    let res = JSON.parse(await req)
    if(isLambda())
        console.log("COMPLETED REQUEST " + endpoint + ": " + Object.keys(query).map(key => `(${key}:${query[key]})`).join(" "))
    return {
        count: res["@attributes"].count,
        list: res[endpoint]
    }
}

const rows = 20;
export async function eventFindaRequestMultiple<RetType>(endpoint: string, pages: number, query?: any): Promise<Response<RetType>>{
    query = query || {}
    query.rows = query.rows || rows
    query.offset = 0

    let returns = (await eventFindaRequest<RetType>(endpoint, query))

    let page = 1;
    let isMore = true
    while(isMore && (!pages || page < pages)){
        query.offset = page*query.rows
        let cur = (await eventFindaRequest<RetType>(endpoint, query))

        if(0 < cur.list.length){
            returns.list.push(...cur.list)
        } else
            isMore = false;

        page++
    }
    return returns
}

export interface Response<ListType>{
    count: number,
    list: ListType[]
}

export interface Node {
    children?: {children: Node[]},
    id: number,
    name: string,
    url_slug: string
    count_current_events: number,
}

function flattenNode(node: Node, list?: Node[]): Node[] {
    if(!list)
        //exclude top node
        list = []
    //exclude numbered zones or invalid slug
    else if(!/\d/.test(node.name) && !node.url_slug.includes(" ")){
        list.push(node)
    }

    //add node children
    if(node.children)
        node.children.children.forEach(child => {
            flattenNode(child, list)
        })

    delete node.children
    node.name = node.name.toLowerCase()

    return list
}

export async function getLocations(levels: number): Promise<LocationNode[]>{
    return flattenNode((await eventFindaRequest<LocationNode>('locations', {
        fields: "location:(id,name,summary,url_slug,count_current_events,children)",
        levels: levels,
        venue: false
    })).list[0]) as LocationNode[]
}


export interface LocationNode extends Node{
    summary: string
}

export interface VenueNode extends LocationNode{
    description: string,
    point: {
        lat: number,
        lng: number
    }
}

let venueFields = "location:(id,name,summary,url_slug,count_current_events,description)"

export async function getVenues(url_slug?: string, pages?: number): Promise<VenueNode[]>{
    let venues = await eventFindaRequestMultiple<VenueNode>('locations', pages||2, {
        venue: true,
        order: "popularity",
        fields: venueFields,
        location_slug: url_slug
    })

    return venues.list
}

export interface Event {
    location: VenueNode,
    name: string,
    description: string,
    datetime_end: string,
    datetime_start: string,
    datetime_summary: string
}

export enum EventRequestOrder {
    popularity = "popularity",
    date = "date"
}

export interface EventRequest {
    location_slug?: string,
    rows?: number,
    order?: EventRequestOrder,
    start_date?: string,
    end_date?: string,
    category_slug?: string,
}

export async function getEvents(req?: EventRequest): Promise<Response<Event>>{
    let events = await eventFindaRequest<Event>('events', Object.assign({
        order: EventRequestOrder.popularity,
        fields: "event:(id,name,url_slug,description,datetime_end,datetime_start,datetime_summary,location),"+venueFields,
        rows: 10
    }, req))
    
    return events
}

export interface CategoryInfo{
    url_slug: string,
    name: string,
    children: {children: CategoryInfo[]},
    count_current_events: number
}

export async function getCategoryChildren(category_slug?: string) {
    let children = (await eventFindaRequest<CategoryInfo>('categories', {
        levels: 2,
        category_slug: category_slug,
        fields: "category:(url_slug,name,children,count_current_events)"
    })).list[0].children
    
    return children && children.children
}

export async function getCategories(): Promise<Node[]> {
    return flattenNode((await eventFindaRequestMultiple<Node>('categories', 4, {
        levels: 3
    })).list[0])
}

// export async function getEvent(req?: EventRequest): Promise<Response<Event>>{
//     let events = await eventFindaRequest<Event>('events', Object.assign({
//         order: EventRequestOrder.popularity,
//         fields: "event:(id,name,url_slug,description,datetime_end,datetime_start,datetime_summary,location),"+venueFields,
//         rows: 10
//     }, req))
    
//     return events
// }