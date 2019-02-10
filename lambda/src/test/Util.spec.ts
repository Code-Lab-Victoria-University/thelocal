import * as Util from '../lib/Util'
import assert from 'assert'
import categoryNames from "../data/category-names.json"

describe("random N from array #randN", () => {
    let testArr = ["asd", "123", "bdfa", "6q3ds", "314ss"]
    for(let i = testArr.length; -1 < i; i--){
        it(`should return ${i} elements`, () => {
            let newArr = Util.randN(testArr, i)
            assert(newArr.length == i)
        })
    }
})

describe("printout categories", () => {
    let newArr = Util.randN(categoryNames, 5)
    console.log(newArr)
})