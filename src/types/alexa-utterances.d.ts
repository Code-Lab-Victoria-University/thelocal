declare function utterances(template: string,
    slots: {[key: string]: string},
    dictionary: {[key: string]: string[]},
    exhaustiveUtterances?: boolean): string[]

declare module 'alexa-utterances' {
    export = utterances 
}