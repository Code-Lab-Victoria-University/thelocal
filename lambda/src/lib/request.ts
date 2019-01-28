import * as request from 'request-promise-native'

export async function eventFindaRequest<RetType>(endpoint: string, query?: any): Promise<RetType[]>{
    let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`
    let response =  request.get(url, {
        auth: {
            user: "alexaevents",
            pass: "3pjmvv59cgqc"
        },
        qs: query
    })
    let ret = JSON.parse(await response)[endpoint] as RetType[]
    console.log("COMPLETED REQUEST " + endpoint + ":\n" + response.uri.href)
    // console.log(JSON.stringify(ret))
    return ret
}

const rows = 20;
export async function eventFindaRequestMultiple<RetType>(endpoint: string, pages: number, query?: any): Promise<RetType[]>{
    let page = 0;
    let returns = [] as RetType[]

    query = query || {}
    query.rows = query.rows || rows

    let isMore = true
    while(isMore && (!pages || page < pages)){
        query.offset = page*query.rows
        let cur = (await eventFindaRequest<RetType>(endpoint, query))

        if(0 < cur.length){
            returns.push(...cur)
        } else
            isMore = false;

        page++
    }
    return returns
}

export interface LocationNode{
    name: string,
    children?: {children: LocationNode[]},
    count_current_events: number,
    id: number,
    summary: string,
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
    return flattenLocation((await eventFindaRequest<LocationNode>('locations', {
        fields: "location:(id,name,summary,url_slug,count_current_events,children)",
        levels: levels||4,
        venue: false
    }))[0])
}

export interface VenueNode extends LocationNode{
    description: string,
    point: {
        lat: number,
        lng: number
    }
}

let venueFields = "location:(id,name,summary,url_slug,count_current_events,description)"

export async function getVenues(url_slug?: string): Promise<VenueNode[]>{
    let venues = await eventFindaRequestMultiple<VenueNode>('locations', 2, {
        venue: true,
        order: "popularity",
        fields: venueFields,
        location_slug: url_slug
    })

    return venues
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
    end_date?: string
}

export async function getEvents(req?: EventRequest): Promise<Event[]>{
    let events = await eventFindaRequest<Event>('events', Object.assign({
        order: EventRequestOrder.popularity,
        fields: "event:(id,name,url_slug,description,datetime_end,datetime_start,datetime_summary,location),"+venueFields,
        rows: 10
    }, req))
    
    return events
}