export function createSagaMiddleware() {
    // Only support one waiting right now :P
    let waiting;

    // Runs the effect on the iterator and returns an object { shouldPause: boolean, nextResult: {the result of iterator.next()} }
    // Next will be ignored if shouldPause === true
    function handleEffect(store, iterator, next) {
        switch (next.value.effect) {
            case 'TAKE':
                return handleTakeEffect(iterator, next);
            case 'SELECT':
                return handleSelectEffect(store, iterator, next);
            case 'PUT':
                return handlePutEffect(store, iterator, next);
            case 'CALL':
                return handleCallEffect(store, iterator, next);
            default:
                return { shouldPause: false, nextResult: iterator.next() }
        }
    }

    function handleTakeEffect(iterator, next) {
        waiting = Object.assign(next.value, { iterator: iterator });
        return { shouldPause: true, nextResult: null }
    }

    function handleSelectEffect(store, iterator, next) {
        const nextPushValue = next.value.selector(store.getState());
        return { shouldPause: false, nextResult: iterator.next(nextPushValue) };
    }

    function handlePutEffect(store, iterator, next) {
        store.dispatch(next.value.action);
        return { shouldPause: false, nextResult: iterator.next() };
    }

    function handleCallEffect(store, iterator, next) {
        let result;
        // Call the function, if it throws pass it back to the generator function and continue running the iterator
        try {
            result = next.value.func(next.value.arg1)
        } catch (e) {
            return { shouldPause: false, nextResult: iterator.throw(e) }
        }
        // Stop running the iterator if the function call is a Promise. The iterator will start back once the Promise finishes.
        // Else it is a regular function call so continue on.
        if (result instanceof Promise) {
            handlePromiseCall(store, iterator, result)
            return { shouldPause: true, nextResult: null }
        } else {
            return { shouldPause: false, nextResult: iterator.next(result) }
        }
    }

    // Attempts to run an iterator to completion. The iterator will be paused when
    // 1. A TAKE effect is found. And resumed when an action is dispatched matching the TAKE
    // 2. A Promise was passed to a CALL effect. And resumed when the Promise is rejected or resolved
    function runIterator(store, iterator, startNext) {
        let next = startNext;
        while (!next.done) {
            if (!next.value || !next.value.effect) {
                next = iterator.next();
                continue;
            }

            const { shouldPause, nextResult } = handleEffect(store, iterator, next);
            if (shouldPause) {
                break;
            }
            next = nextResult;
        }
    }

    function handlePromiseCall(store, iterator, promise) {
        promise.then(data => runIterator(store, iterator, iterator.next(data)),
                     err  => runIterator(store, iterator, iterator.throw(err)));
    }

    function run(store, saga) {
        const iterator = saga();
        runIterator(store, iterator, iterator.next());
    }

    function handleAction(store, action) {
        if (action.type === waiting.type) {
            runIterator(store, waiting.iterator, waiting.iterator.next(action));
        }
    }

    // A little trickery so that we can get access to the store inside of our exposed run method
    let runDynamic;
    function middleware(store) {
        runDynamic = (saga) => run(store, saga);

        return next => action => {
            const result = next(action);
            handleAction(store, action);
            return result;
        };
    }

    // Add the run method to the middleware
    // TODO support args passed to saga
    middleware.run = (saga) => runDynamic(saga)

    return middleware;
}

export function take(type) {
    return { effect: 'TAKE', type };
}

export function select(selector) {
    return { effect: 'SELECT', selector }
}

export function put(action) {
    return { effect: 'PUT', action };
}

// TODO support multiple arguments
export function call(func, arg1) {
    return { effect: 'CALL', func, arg1 };
}