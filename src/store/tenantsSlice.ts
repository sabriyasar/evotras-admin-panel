import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { call, put, takeEvery, takeLatest } from "redux-saga/effects";
import { api, errMsg } from "@/lib/api";

export type LicenseStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";

export interface DomainDto {
  id: number;
  host: string;
  verified: boolean;
  verifiedAt: string | null;
  primary: boolean;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  domains: string[];
  domainDetails: DomainDto[];
  plan: string | null;
  status: LicenseStatus | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxProducts: number | null;
  maxUsers: number | null;
}

export type SaveKind = "create" | "license" | "domain" | "user";

interface State {
  items: Tenant[];
  loading: boolean;
  saving: boolean;
  saved: number;
  error?: string;
  saveError?: string;
  primarySaving: boolean;
  primarySaved: number;
  primaryError?: string;
}

const slice = createSlice({
  name: "tenants",
  initialState: {
    items: [],
    primarySaving: false,
    primarySaved: 0,
    loading: false,
    saving: false,
    saved: 0,
  } as State,
  reducers: {
    fetchTenants: (s) => {
      s.loading = true;
      s.error = undefined;
    },
    fetchTenantsSuccess: (s, a: PayloadAction<Tenant[]>) => {
      s.loading = false;
      s.items = a.payload;
    },
    fetchTenantsFailure: (s, a: PayloadAction<string>) => {
      s.loading = false;
      s.error = a.payload;
    },
    saveRequest: (
      s,
      _a: PayloadAction<{
        kind: SaveKind;
        id?: number;
        body: Record<string, unknown>;
      }>,
    ) => {
      s.saving = true;
      s.saveError = undefined;
    },
    saveSuccess: (s) => {
      s.saving = false;
      s.saved += 1;
    },
    saveFailure: (s, a: PayloadAction<string>) => {
      s.saving = false;
      s.saveError = a.payload;
    },
    clearSaveError: (s) => {
      s.saveError = undefined;
    },
    makeDomainPrimary: (
      s,
      _a: PayloadAction<{ tenantId: number; domainId: number }>,
    ) => {
      s.primarySaving = true;
      s.primaryError = undefined;
    },

    makeDomainPrimarySuccess: (s) => {
      s.primarySaving = false;
      s.primarySaved += 1;
    },

    makeDomainPrimaryFailure: (s, a: PayloadAction<string>) => {
      s.primarySaving = false;
      s.primaryError = a.payload;
    },

    clearPrimaryError: (s) => {
      s.primaryError = undefined;
    },
  },
});

export const {
  fetchTenants,
  fetchTenantsSuccess,
  fetchTenantsFailure,
  saveRequest,
  saveSuccess,
  saveFailure,
  clearSaveError,
  makeDomainPrimary,
  makeDomainPrimarySuccess,
  makeDomainPrimaryFailure,
  clearPrimaryError,
} = slice.actions;

export default slice.reducer;

function* fetchSaga() {
  try {
    const res: { data: Tenant[] } = yield call(api.get, "/platform/tenants");
    yield put(fetchTenantsSuccess(res.data));
  } catch (e) {
    yield put(fetchTenantsFailure(errMsg(e)));
  }
}

function* saveSaga(a: ReturnType<typeof saveRequest>) {
  const { kind, id, body } = a.payload;

  const req = {
    create: { method: "post", url: "/platform/tenants" },
    license: { method: "put", url: `/platform/tenants/${id}/license` },
    domain: { method: "post", url: `/platform/tenants/${id}/domains` },
    user: { method: "post", url: `/platform/tenants/${id}/users` },
  }[kind];

  try {
    yield call(api.request, { ...req, data: body });
    yield put(saveSuccess());
    yield put(fetchTenants());
  } catch (e) {
    yield put(saveFailure(errMsg(e)));
  }
}
function* makeDomainPrimarySaga(a: ReturnType<typeof makeDomainPrimary>) {
  const { tenantId, domainId } = a.payload;

  try {
    yield call(
      api.post,
      `/platform/tenants/${tenantId}/domains/${domainId}/primary`,
    );

    yield put(makeDomainPrimarySuccess());
    yield put(fetchTenants());
  } catch (e) {
    yield put(makeDomainPrimaryFailure(errMsg(e)));
  }
}

export function* tenantsSaga() {
  yield takeLatest(fetchTenants.type, fetchSaga);
  yield takeEvery(saveRequest.type, saveSaga);
  yield takeEvery(makeDomainPrimary.type, makeDomainPrimarySaga);
}
