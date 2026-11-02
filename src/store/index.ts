import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { all, fork } from 'redux-saga/effects';
import auth, { authSaga } from './authSlice';
import tenants, { tenantsSaga } from './tenantsSlice';

const saga = createSagaMiddleware();
export const store = configureStore({
  reducer: { auth, tenants },
  middleware: (g) => g({ thunk: false }).concat(saga),
});
saga.run(function* () { yield all([fork(authSaga), fork(tenantsSaga)]); });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
