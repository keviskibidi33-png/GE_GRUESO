import axios from "axios"
import type {
    GeGruesoPayload,
    GeGruesoSaveResponse,
    GeGruesoEnsayoDetail,
    GeGruesoEnsayoSummary,
} from "@/types"

const API_URL = import.meta.env.VITE_API_URL || "https://api.geofal.com.pe"

const api = axios.create({
    baseURL: API_URL,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new CustomEvent("session-expired"))
        }
        return Promise.reject(error)
    },
)

export async function saveGeGruesoEnsayo(
    payload: GeGruesoPayload,
    ensayoId?: number,
): Promise<GeGruesoSaveResponse> {
    const { data } = await api.post<GeGruesoSaveResponse>("/api/ge-grueso/excel", payload, {
        params: {
            download: false,
            ensayo_id: ensayoId,
        },
    })
    return data
}

export async function saveAndDownloadGeGruesoExcel(
    payload: GeGruesoPayload,
    ensayoId?: number,
): Promise<{ blob: Blob; ensayoId?: number }> {
    const response = await api.post("/api/ge-grueso/excel", payload, {
        params: {
            download: true,
            ensayo_id: ensayoId,
        },
        responseType: "blob",
    })

    const ensayoIdHeader = response.headers["x-ge-grueso-id"]
    const parsedId = Number(ensayoIdHeader)
    return {
        blob: response.data,
        ensayoId: Number.isFinite(parsedId) ? parsedId : undefined,
    }
}

export async function listGeGruesoEnsayos(limit = 100): Promise<GeGruesoEnsayoSummary[]> {
    const { data } = await api.get<GeGruesoEnsayoSummary[]>("/api/ge-grueso/", {
        params: { limit },
    })
    return data
}

export async function getGeGruesoEnsayoDetail(ensayoId: number): Promise<GeGruesoEnsayoDetail> {
    const { data } = await api.get<GeGruesoEnsayoDetail>(`/api/ge-grueso/${ensayoId}`)
    return data
}

export default api
