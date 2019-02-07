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

export function isLambda(): boolean {
    return process.env.LAMBDA_TASK_ROOT !== undefined;
}

export function flatMap<Val>(arr: Val[], method: (val: Val) => Val[]): Val[] {
    return arr.reduce((arr, cur) => arr.concat(method(cur)), [] as Val[])
}