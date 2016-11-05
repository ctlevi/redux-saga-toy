import { createStore, applyMiddleware } from 'redux';
import { createMiddleware, take, select, put, call } from './saga';

const FETCH_FINISHED = 'FETCH_FINISHED';

const initialState = {
    loading: false,
    data: []
};

function reducer(state = initialState, action) {
    switch(action.type) {
        case FETCH_FINISHED:
            return {
                loading: false,
                data: action.data
            };
        default:
            return state;
    }
}

const sagaMiddleware = createMiddleware();
const store = createStore(reducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(mySaga);

store.subscribe(() => {
//   console.log(store.getState())
});

window.store = store;

function* mySaga() {
    yield 23;
    const action = yield take('FETCH_FINISHED');
    console.log('The action was', action);
    const loading = yield select((state) => state.loading);
    console.log(loading);
    try {
        yield call(() => { throw Error('HEY') });
    } catch (e) {
        console.log(e)
    }
    const result = yield call(() => fetch('http://www.reddit.com/r/funny.json').then(result => result.json()));
    console.log('The result was', result);
    try {
        const result2 = yield call(fetch.bind(window), 'http://www.reddit.com/r/bluelurghldjfddjkjkd.json');
    } catch (e) {
        console.log(e)
    }
    yield put({ type: 'FETCH_FINISHED', data: ['hey there guys', 'whoa again', 'me too'] })
    yield 100;
}