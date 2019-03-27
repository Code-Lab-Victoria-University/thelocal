interface Array<T> {
    flatMap(callback: flatMapCallback<T>): T[]
}

interface flatMapCallback<T> {
    (val: T): T[]
}


Array.prototype.flatMap = function (callback) {
    return this.reduce((arr, cur) => arr.concat(callback(cur)), [])
}