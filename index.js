import { createStore, applyMiddleware } from 'redux';
import { createSagaMiddleware, take, select, put, call } from './saga';

const FETCH_START = 'FETCH_START';
const FETCH_FINISHED = 'FETCH_FINISHED';

const initialState = {
    loading: false,
    posts: []
};

function reducer(state = initialState, action) {
    switch(action.type) {
        case FETCH_START:
            return {
                loading: true,
                posts: []
            };
        case FETCH_FINISHED:
            return {
                loading: false,
                posts: action.posts
            };
        default:
            return state;
    }
}

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(fetchRedditPostsSaga);

store.subscribe(() => {
    const { loading, posts } = store.getState();
    const postsDiv = document.querySelector('#posts');
    if (loading) {
        postsDiv.innerHTML = 'loading...';
    } else {
        const postsList = store.getState().posts.map((post) => `<li>${post}</li>`).join('')
        postsDiv.innerHTML = `<ul>${postsList}</ul>`;
    }
})

document.querySelector('#fetchPostsButton').onclick = function() {
    const subreddit = document.querySelector('#subredditInput').value;
    console.log('eh')
    store.dispatch({ type: FETCH_START, subreddit });
}

function* fetchRedditPostsSaga() {
    while (true) {
        const action = yield take(FETCH_START);
        const result = yield call(() => fetch(`http://www.reddit.com/r/${action.subreddit}.json`).then(result => result.json()));
        const postTitles = (result.data.children || [])
            .map((post) => post.data.title)
            .filter((title) => title);

        yield put({ type: 'FETCH_FINISHED', posts: postTitles })
    }
}