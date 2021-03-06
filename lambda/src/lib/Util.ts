export function baseEqual(a: string, b: string): boolean{
    return a.localeCompare(b, 'en', {
        sensitivity: "base"
    }) === 0
}
export function escape(text: string) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
  };

export function padN(num: number, nChars: number){
    let str = num.toString()
    while(str.length < nChars)
        str = "0" + str
    return str
}

export function mmDD(date: Date): string {
    return padN(date.getMonth()+1, 2) + padN(date.getDate(), 2)
}

export function yyMMDD(date: Date): string {
    return date.getFullYear() + mmDD(date)
}

export function rand<Val>(...input: Val[]): Val{
    return input[Math.floor(input.length*Math.random())]
}

export function randN<Val>(input: Val[], n: number): Val[]{
    let goodI = [] as number[]
    while(goodI.length < n){
        let newI = Math.floor(input.length*Math.random())
        if(!goodI.includes(newI))
            goodI.push(newI)
    }
    return goodI.map(i => input[i])
}

export function isLambda(): boolean {
    return process.env.LAMBDA_TASK_ROOT !== undefined;
}

/**
 * Join an array with commas, with a special separator at the end (and/or) eg
 * 
 * ([apples, oranges, pineapples, pears], "and") --> "apples, oranges, pineapples and pears"
 */
export function prettyJoin(arr: string[], lastSepChar: string, extraComma?: boolean){
    if(arr.length < 2)
        return arr[0]
    return arr.slice(0, -1).join(", ") + `${extraComma ? ',' : ''} ${lastSepChar} ` + arr[arr.length-1]
}

export function hasElements<T>(arr?: T[]){
    return arr !== undefined && 0 < arr.length
}

export function includesOrEqual<T>(elm: T, itemOrArr?: T|T[]): boolean{
    return Array.isArray(itemOrArr) ? itemOrArr.includes(elm) : elm === itemOrArr
}

import categories from '../data/category-names.json'

/**
 * @returns empty string when invalid id
 * @param id 
 */
export function getCategoryName(id?: number) {
    if(id === undefined)
        return ""

    let cat = categories.find(cat => cat.id === id.toString())
    return cat ? cat.title : ""
}