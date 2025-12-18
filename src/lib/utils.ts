import { toRaw, isRef, isReactive, isProxy } from 'vue'

export function isPlainObject(obj: any): obj is Record<string, any> {
    let proto
    return (
        obj !== null &&
        typeof obj === 'object' &&
        ((proto = Object.getPrototypeOf(obj)) === Object.prototype || proto === null)
    )
}

export function deepToRaw<T extends {}>(value: T): T {
    const objectIterator = (input: any): any => {
        if (Array.isArray(input)) {
            return input.map((item) => objectIterator(item))
        }
        if (isRef(input) || isReactive(input) || isProxy(input)) {
            return objectIterator(toRaw(input))
        }
        if (isPlainObject(input)) {
            return Object.keys(input).reduce((acc, key) => {
                acc[key as keyof typeof acc] = objectIterator(input[key])
                return acc
            }, {} as T)
        }
        return input
    }

    return objectIterator(value)
}
