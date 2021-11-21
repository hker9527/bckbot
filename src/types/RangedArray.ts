export type ArrayMax<T, X extends number, A extends T[] = []> =
    A | ([ T, ...A ]['length'] extends X ? never : ArrayMax<T, X, [ T, ...A ]>);
export type RangedArray<T, N extends number, X extends number> = Exclude<ArrayMax<T, X>, ArrayMax<T, N>>;

export type RangedArray25<T> = [
    ...RangedArray<T, 1, 20>, T?, T?, T?, T?, T?, T?
];