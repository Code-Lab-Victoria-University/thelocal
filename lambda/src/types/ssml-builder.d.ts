declare class Speech{
    say(text: string): this
    /**
     * @param time "time(s) or strength (eg: 0.5s, x-weak)"
     */
    pause(time: string): this
    emphasis(type: string, text: string): this
    prosody(options: object, text: string): this
    paragraph(text: string): this
    sentence(text: string): this

    /** true to remove the surrounding <speak> tags */
    ssml(noTagsSurround?: boolean): string
}

declare module 'ssml-builder' {
    export = Speech
}

declare class AmazonSpeech extends Speech{
    whisper(text: string): this

    /** Interpretations: https://developer.amazon.com/docs/custom-skills/speech-synthesis-markup-language-ssml-reference.html#say-as 
     * 
     * Interjections: https://developer.amazon.com/docs/custom-skills/speechcon-reference-interjections-english-australia.html
    */
    sayAs(options: {
        interpret: string,
        word: string,
        format?: string
    }): this
}

declare module 'ssml-builder/amazon_speech' {
    export = AmazonSpeech
}