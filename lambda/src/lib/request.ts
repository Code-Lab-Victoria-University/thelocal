import * as request from 'request-promise-native'
import { isLambda } from './Util';

/**
 * @returns undefined when errors, such as too many requests being made
 * @param endpoint 
 * @param query 
 */
export async function eventFindaRequest<RetType>(endpoint: string, query?: any): Promise<Response<RetType>|undefined>{
    let url = `http://api.eventfinda.co.nz/v2/${endpoint}.json`
    let req =  request.get(url, {
        auth: {
            user: "alexaevents",
            pass: "3pjmvv59cgqc"
        },
        qs: query
    })
    try{
        let respBody = await req
        let res = JSON.parse(respBody)
        if(isLambda()){
            console.log("COMPLETED REQUEST " + endpoint + ": " + Object.keys(query).map(key => `(${key}:${query[key]})`).join(" ")
            + "\nRESPONSE:\n" + respBody)
        }
        return {
            count: res["@attributes"].count,
            list: res[endpoint]
        } as Response<RetType>

    //return empty on error
    } catch (e) {
        console.error("FAILED REQUEST " + endpoint + ": " + Object.keys(query).map(key => `(${key}:${query[key]})`).join(" "))
        return undefined
    }
}

export const maxParallelRequests = 7;
const rows = 20;
export async function eventFindaRequestMultiple<RetType>(endpoint: string, pages: number, query?: any): Promise<Response<RetType>>{
    query = query || {}
    query.rows = query.rows || rows

    let returns: (Response<RetType>|undefined)[] = []
    let awaits: Promise<Response<RetType>|undefined>[] = []

    let page = 0;

    while((!pages || page < pages)){
        awaits.push(eventFindaRequest<RetType>(endpoint, Object.assign({offset: page*query.rows}, query)))
        page++

        if(maxParallelRequests < awaits.length){
            let curRets = await Promise.all(awaits)
            returns.push(...curRets)
            awaits = []

            //break if found end of list
            if(curRets.some(ret => ret !== undefined && ret.count === 0))
                break
            //lil timeout between bulk requests
            else
                await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    if(awaits.length)
        returns.push(...await Promise.all(awaits))
        
    return returns
        .map(cur => cur !== undefined ? cur : {count: 0, list: []})
        .reduce((cur, prev) => {
            if(cur && 0 < cur.list.length){
                prev.list.push(...cur.list)
                prev.count += cur.count
            }
            return prev;
    })
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

function flattenNode(node: Node, list?: Node[]) {
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

export async function getLocations(levels: number) {
    return flattenNode((await eventFindaRequest<LocationNode>('locations', {
        fields: "location:(id,name,summary,url_slug,count_current_events,children)",
        levels: levels,
        venue: false
    }))!.list[0]) as LocationNode[]
}


export interface LocationNode extends Node{
    summary: string
}

export interface VenueNode extends LocationNode{
    description: string,
    point: {
        lat: number,
        lng: number
    },
    booking_phone?: string
}

let venueFields = "location:(id,name,summary,url_slug,count_current_events,description,booking_phone)"

export async function getVenues(url_slug?: string, pages?: number, order?: string) {
    let venues = await eventFindaRequestMultiple<VenueNode>('locations', pages||2, {
        venue: true,
        order: order,
        fields: venueFields,
        location_slug: url_slug
    })

    return venues.list
}

export interface Times {
    datetime_start: string,
    datetime_end: string
}

export interface Event {
    location: VenueNode,
    id: number,
    url_slug: string,
    name: string,
    description: string,
    datetime_end: string,
    datetime_start: string,
    datetime_summary: string
    sessions?: {sessions: Times[]}
    booking_phone?: string
}

export enum EventRequestOrder {
    popularity = "popularity",
    date = "date"
}

export interface EventRequest {
    location_slug?: string,
    rows?: number,
    offset?: number,
    order?: EventRequestOrder,
    start_date?: string,
    end_date?: string,
    category?: number,
}

export async function getEvents(req?: EventRequest) {
    return (await eventFindaRequest<Event>('events', Object.assign({
        order: EventRequestOrder.popularity,
        fields: "event:(id,name,url_slug,session,description,datetime_end,datetime_start,datetime_summary,location,booking_phone),session:(datetime_end,datetime_start)"+venueFields,
        rows: 10
    }, req)))!
}

export interface CategoryInfo{
    id: number,
    name: string,
    children: {children: CategoryInfo[]},
    count_current_events: number
}

export async function getCategoryChildren(category_id?: number) {
    let children = (await eventFindaRequest<CategoryInfo>('categories', {
        levels: 2,
        category: category_id,
        fields: "category:(id,name,children,count_current_events)"
    }))!.list[0].children
    
    return children && children.children
}

export async function getCategoryTree(){
    return (await eventFindaRequest<CategoryInfo>('categories', {
        levels: 3,
        rows: 1
    }))!.list[0]
}