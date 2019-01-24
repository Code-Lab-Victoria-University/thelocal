export function baseEqual(a: string, b: string): boolean{
    return a.localeCompare(b, 'en', {
        sensitivity: "base"
    }) === 0
}