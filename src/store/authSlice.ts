import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { call, put, takeLatest } from "redux-saga/effects";
import { api, errMsg, USER_KEY, initializeCsrf } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface State {
  user: User | null;
  ready: boolean;
  loading: boolean;
  error?: string;
}

const slice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    ready: false,
    loading: false,
  } as State,
  reducers: {
    hydrate: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.ready = true;
    },
    loginRequest: (
      state,
      _action: PayloadAction<{ email: string; password: string }>,
    ) => {
      state.loading = true;
      state.error = undefined;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.user = action.payload;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
  },
});

export const { hydrate, loginRequest, loginSuccess, loginFailure, logout } =
  slice.actions;

export default slice.reducer;

function* loginSaga(action: ReturnType<typeof loginRequest>) {
  try {
    // CSRF token'ını backend'den al ve Axios isteklerine tanıt.
    yield call(initializeCsrf);

    const res: { data: User } = yield call(
      api.post,
      "/auth/login",
      action.payload,
    );

    const user = res.data;

    if (user.role !== "PLATFORM_ADMIN") {
      yield call(api.post, "/auth/logout");
      throw new Error("Bu panele yalnızca platform yöneticileri girebilir");
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    yield put(loginSuccess(user));
  } catch (error) {
    yield put(loginFailure(errMsg(error)));
  }
}

function* logoutSaga() {
  try {
    yield call(api.post, "/auth/logout");
  } catch {
    // Sunucuya ulaşılamasa bile yerel oturum temizlenecek.
  }

  localStorage.removeItem(USER_KEY);
}

export function* authSaga() {
  yield takeLatest(loginRequest.type, loginSaga);
  yield takeLatest(logout.type, logoutSaga);
}
