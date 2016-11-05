export function createMiddleware() {
    // Only support one waiting right now :P
    let waiting;

    function run(store, saga) {
        const iterator = saga();
        runIterator(store, iterator, iterator.next());
    }

    function runIterator(store, iterator, startNext) {
        let next = startNext;
        while (!next.done) {
            let nextPushValue;
            if (next.value && next.value.effect === 'TAKE') {
                waiting = Object.assign(next.value, { iterator: iterator });
                break;
            } else if (next.value && next.value.effect === 'SELECT') {
                nextPushValue = next.value.selector(store.getState());
            } else if (next.value && next.value.effect === 'PUT') {
                store.dispatch(next.value.action);
            } else if (next.value && next.value.effect === 'CALL') {
                try {
                    const result = next.value.func(next.value.arg1)
                    if (result instanceof Promise) {
                        result.then(data => runIterator(store, iterator, iterator.next(data)),
                                    err  => runIterator(store, iterator, iterator.throw(err)));
                        break;
                    } else {
                        nextPushValue = result;
                    }
                } catch (e) {
                    next = iterator.throw(e);
                    continue;
                }
            }

            next = iterator.next(nextPushValue);
        }
    }

    function handleAction(action, store) {
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
            handleAction(action, store);
            return result;
        };
    }

    // Add the run method to the middleware
    // TODO support args passed to saga
    middleware.run = (saga) => runDynamic(saga)

    return middleware;
}

export function take(type) {
    return {
        effect: 'TAKE',
        type: type,
    };
}

export function select(selector) {
    return {
        effect: 'SELECT',
        selector: selector,
    };
}

export function put(action) {
    return {
        effect: 'PUT',
        action: action,
    };
}

// TODO support multiple arguments
export function call(func, arg1) {
    return {
        effect: 'CALL',
        func: func,
        arg1: arg1
    };
}