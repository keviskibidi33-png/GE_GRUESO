import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Beaker, Download, Loader2, Trash2 } from "lucide-react"
import { getGeGruesoEnsayoDetail, saveAndDownloadGeGruesoExcel, saveGeGruesoEnsayo } from "@/services/api"
import type { GeGruesoPayload, SiNoFlag } from "@/types"

const DRAFT_KEY = "ge_grueso_form_draft_v1"
const DEBOUNCE_MS = 700
const REVISORES = ["-", "FABIAN LA ROSA"] as const
const APROBADORES = ["-", "IRMA COAQUIRA"] as const

const TMN = [
  ["4 in", "40"],
  ["3 1/2 in", "25"],
  ["3 in", "18"],
  ["2 1/2", "12"],
  ["2 in", "8"],
  ["1 1/2 in", "5"],
  ["1 in", "4"],
  ["3/4 in", "3"],
  ["1/2 in", "2"],
  ["N°4", "2"],
] as const

type EquipoField =
  | "equipo_balanza_1g_codigo"
  | "equipo_horno_110_codigo"
  | "equipo_termometro_01c_codigo"
  | "equipo_canastilla_codigo"
  | "equipo_tamiz_codigo"
  | "equipo_gravedad_especifica_codigo"

const EQUIPO_OPTIONS: Record<EquipoField, readonly string[]> = {
  equipo_balanza_1g_codigo: ["-", "EQP-0050"],
  equipo_horno_110_codigo: ["-", "EQP-0049"],
  equipo_termometro_01c_codigo: ["-", "INS-0153"],
  equipo_canastilla_codigo: ["-", "INS-0191"],
  equipo_tamiz_codigo: ["-", "INS-0053 (No 4)", "INS-0053 (No 4) y INS-0048"],
  equipo_gravedad_especifica_codigo: ["-", "EQP-0119"],
}

const getEquipmentOptions = (value: string | null | undefined, base: readonly string[]) => {
  const current = (value ?? "").trim()
  if (!current || base.includes(current)) return base
  return [...base, current]
}

type NumericField =
  | "masa_retenida_malla_1_1_2_pct"
  | "masa_muestra_inicial_total_kg"
  | "masa_fraccion_01_kg"
  | "masa_fraccion_02_kg"
  | "fr1_a_g"
  | "fr1_b_g"
  | "fr1_c_g"
  | "fr1_d_g"
  | "fr1_masa_total_g"
  | "fr2_a_g"
  | "fr2_b_g"
  | "fr2_c_g"
  | "fr2_d_g"
  | "fr2_masa_total_g"

const formatTodayShortDate = () => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

const ensureFechaEnsayo = (value: string | null | undefined) => {
  const text = (value ?? "").trim()
  return text || formatTodayShortDate()
}

const init = (): GeGruesoPayload => ({
  muestra: "",
  numero_ot: "",
  fecha_ensayo: formatTodayShortDate(),
  realizado_por: "",
  tamano_maximo_nominal: "",
  agregado_grupo_ligero_si_no: "-",
  retenido_malla_no4_si_no: "-",
  retenido_malla_1_1_2_si_no: "-",
  fecha_hora_inmersion_inicial: "",
  fecha_hora_inmersion_final: "",
  equipo_balanza_1g_codigo: "-",
  equipo_horno_110_codigo: "-",
  equipo_termometro_01c_codigo: "-",
  equipo_canastilla_codigo: "-",
  equipo_tamiz_codigo: "-",
  equipo_gravedad_especifica_codigo: "-",
  seco_horno_110_si_no: "-",
  ensayada_en_fracciones_si_no: "-",
  malla_fraccion: "",
  masa_retenida_malla_1_1_2_pct: null,
  masa_muestra_inicial_total_kg: null,
  masa_fraccion_01_kg: null,
  masa_fraccion_02_kg: null,
  fr1_a_g: null,
  fr1_b_g: null,
  fr1_c_g: null,
  fr1_d_g: null,
  fr1_masa_total_g: null,
  fr2_a_g: null,
  fr2_b_g: null,
  fr2_c_g: null,
  fr2_d_g: null,
  fr2_masa_total_g: null,
  observaciones: "",
  revisado_por: "-",
  revisado_fecha: formatTodayShortDate(),
  aprobado_por: "-",
  aprobado_fecha: formatTodayShortDate(),
})

const normalizeNumericText = (value: string) => {
  const raw = value.trim().replace(/\s+/g, "")
  if (!raw) return ""
  const hasComma = raw.includes(",")
  const hasDot = raw.includes(".")
  if (hasComma && hasDot) {
    return raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "")
  }
  if (hasComma) return raw.replace(",", ".")
  return raw
}

const n = (value: unknown): number | null => {
  if (value === "" || value == null) return null
  const out = Number(normalizeNumericText(String(value)))
  return Number.isFinite(out) ? out : null
}

const y2 = () => new Date().getFullYear().toString().slice(-2)
const normDate = (raw: string) => {
  const v = raw.trim()
  if (!v) return ""
  const pad2 = (part: string) => part.padStart(2, "0").slice(-2)
  const build = (d: string, m: string, y: string = y2()) => `${pad2(d)}/${pad2(m)}/${pad2(y)}`
  if (v.includes("/")) {
    const [d = "", m = "", yRaw = ""] = v.split("/").map((part) => part.trim())
    if (!d || !m) return v
    let yy = yRaw.replace(/\D/g, "")
    if (yy.length === 4) yy = yy.slice(-2)
    if (yy.length === 1) yy = `0${yy}`
    if (!yy) yy = y2()
    return build(d, m, yy)
  }
  const d = v.replace(/\D/g, "")
  if (d.length === 2) return build(d[0], d[1])
  if (d.length === 3) return build(d[0], d.slice(1, 3))
  if (d.length === 4) return build(d.slice(0, 2), d.slice(2, 4))
  if (d.length === 5) return build(d[0], d.slice(1, 3), d.slice(3, 5))
  if (d.length === 6) return build(d.slice(0, 2), d.slice(2, 4), d.slice(4, 6))
  if (d.length >= 8) return build(d.slice(0, 2), d.slice(2, 4), d.slice(6, 8))
  return v
}
const normMuestra = (raw: string) => {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "")
  const m = c.match(/^(\d+)(?:-SU)?(?:-(\d{2}))?$/)
  return m ? `${m[1]}-SU-${m[2] || y2()}` : raw.trim().toUpperCase()
}
const normOt = (raw: string) => {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "")
  const m = c.match(/^(?:N?OT-)?(\d+)(?:-(\d{2}))?$/) || c.match(/^(\d+)(?:-(?:N?OT))?(?:-(\d{2}))?$/)
  return m ? `${m[1]}-${m[2] || y2()}` : raw.trim().toUpperCase()
}
const ensayoIdFromUrl = () => {
  const v = Number(new URLSearchParams(window.location.search).get("ensayo_id"))
  return Number.isInteger(v) && v > 0 ? v : null
}
const round4 = (v: number | null) => (v == null ? null : Number(v.toFixed(4)))
const sum = (arr: Array<number | null | undefined>): number | null => {
  const values = arr.filter((x): x is number => typeof x === "number")
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0)
}

const extractApiErrorMessage = async (error: unknown): Promise<string> => {
  let msg = error instanceof Error ? error.message : "Error desconocido"
  if (!axios.isAxiosError(error)) return msg

  const detail = error.response?.data?.detail
  if (typeof detail === "string" && detail.trim()) return detail

  const blob = error.response?.data
  if (blob instanceof Blob) {
    try {
      const raw = await blob.text()
      if (!raw) return msg

      try {
        const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown }
        if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail
        if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message
      } catch {
        // non-json text body
      }

      return raw.slice(0, 300)
    } catch {
      return msg
    }
  }

  return msg
}

function SiNo({ value, onChange }: { value: SiNoFlag | undefined; onChange: (v: SiNoFlag) => void }) {
  const v = value ?? "-"
  const btn = (t: SiNoFlag) =>
    `rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-500/35 ${v === t ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`
  const box = (t: SiNoFlag) =>
    `ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm border ${v === t ? "border-slate-500 text-slate-700" : "border-slate-300 text-slate-700"}`
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn("-")} onClick={() => onChange("-")}>
        -
      </button>
      <button type="button" className={btn("SI")} onClick={() => onChange("SI")}>
        SI <span className={box("SI")}>{v === "SI" ? "X" : ""}</span>
      </button>
      <button type="button" className={btn("NO")} onClick={() => onChange("NO")}>
        NO <span className={box("NO")}>{v === "NO" ? "X" : ""}</span>
      </button>
    </div>
  )
}

function Report({
  title,
  values,
  setNum,
  totalAuto,
  totalValue,
  totalField,
  input,
}: {
  title: string
  values: { a: number | null | undefined; b: number | null | undefined; c: number | null | undefined; d: number | null | undefined }
  setNum: (field: NumericField, raw: string) => void
  totalAuto: number | null
  totalValue: number | null
  totalField: NumericField
  input: string
}) {
  return (
    <div className="border-b border-slate-300 p-2">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="w-10 border border-slate-300"></th>
            <th className="border border-slate-300">Descripción</th>
            <th className="w-16 border border-slate-300">Und</th>
            <th className="w-56 border border-slate-300">Datos</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["A", "Masa de la muestra secada al horno", "a", values.a],
            ["B", "Masa de la muestra secada al horno constante", "b", values.b],
            ["C", "Masa de la muestra de ensayo de superficie seca saturada", "c", values.c],
            ["D", "Masa aparente de la muestra de prueba sumergida en agua", "d", values.d],
          ].map(([sym, label, k, val]) => (
            <tr key={String(k)}>
              <td className="border border-slate-300 text-center">{sym}</td>
              <td className="border border-slate-300 px-2 py-1">{label}</td>
              <td className="border border-slate-300 text-center">g</td>
              <td className="border border-slate-300 p-1">
                <input type="number" step="any" className={input} value={(val as number | null | undefined) ?? ""} onChange={(e) => setNum(`${title.startsWith("1") ? "fr1" : "fr2"}_${k}_g` as NumericField, e.target.value)} />
              </td>
            </tr>
          ))}
          <tr>
            <td className="border border-slate-300" colSpan={2}></td>
            <td className="border border-slate-300 px-2 py-1 text-right font-semibold">Masa total =</td>
            <td className="border border-slate-300 p-1">
              <input type="number" step="any" className={`${input} bg-slate-50`} value={totalValue ?? totalAuto ?? ""} onChange={(e) => setNum(totalField, e.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function GeGruesoForm() {
  const [form, setForm] = useState<GeGruesoPayload>(() => init())
  const [loading, setLoading] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(() => ensayoIdFromUrl())

  const setField = useCallback(<K extends keyof GeGruesoPayload>(k: K, v: GeGruesoPayload[K]) => setForm((p) => ({ ...p, [k]: v })), [])
  const setNum = useCallback((k: NumericField, raw: string) => setField(k, n(raw) as GeGruesoPayload[NumericField]), [setField])

  const fr1Auto = useMemo(() => round4(sum([form.fr1_a_g, form.fr1_b_g, form.fr1_c_g, form.fr1_d_g])), [form.fr1_a_g, form.fr1_b_g, form.fr1_c_g, form.fr1_d_g])
  const fr2Auto = useMemo(() => round4(sum([form.fr2_a_g, form.fr2_b_g, form.fr2_c_g, form.fr2_d_g])), [form.fr2_a_g, form.fr2_b_g, form.fr2_c_g, form.fr2_d_g])

  useEffect(() => {
    const raw = localStorage.getItem(`${DRAFT_KEY}:${editingId ?? "new"}`)
    if (!raw) return
    try {
      const hydrated = { ...init(), ...JSON.parse(raw) } as GeGruesoPayload
      hydrated.fecha_ensayo = ensureFechaEnsayo(hydrated.fecha_ensayo)
      setForm(hydrated)
    } catch {}
  }, [editingId])

  useEffect(() => {
    const t = window.setTimeout(() => localStorage.setItem(`${DRAFT_KEY}:${editingId ?? "new"}`, JSON.stringify(form)), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [editingId, form])

  useEffect(() => {
    if (!editingId) return
    let cancelled = false
    const run = async () => {
      setLoadingEdit(true)
      try {
        const detail = await getGeGruesoEnsayoDetail(editingId)
        if (!cancelled && detail.payload) {
          const hydrated = { ...init(), ...detail.payload } as GeGruesoPayload
          hydrated.fecha_ensayo = ensureFechaEnsayo(hydrated.fecha_ensayo)
          setForm(hydrated)
        }
      } catch {
        toast.error("No se pudo cargar ensayo GE Grueso para edicion.")
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [editingId])

  const save = useCallback(
    async (download: boolean) => {
      if (!form.muestra || !form.numero_ot || !form.realizado_por || !form.fecha_ensayo) {
        return toast.error("Complete Muestra, N OT, Fecha de ensayo y Realizado por.")
      }
      setLoading(true)
      try {
        const payload: GeGruesoPayload = { ...form, fr1_masa_total_g: form.fr1_masa_total_g ?? fr1Auto, fr2_masa_total_g: form.fr2_masa_total_g ?? fr2Auto }
        if (download) {
          const { blob } = await saveAndDownloadGeGruesoExcel(payload, editingId ?? undefined)
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `GE_GRUESO_${form.numero_ot}_${new Date().toISOString().slice(0, 10)}.xlsx`
          a.click()
          URL.revokeObjectURL(url)
        } else {
          await saveGeGruesoEnsayo(payload, editingId ?? undefined)
        }
        localStorage.removeItem(`${DRAFT_KEY}:${editingId ?? "new"}`)
        setForm(init())
        setEditingId(null)
        if (window.parent !== window) window.parent.postMessage({ type: "CLOSE_MODAL" }, "*")
        toast.success(download ? "GE Grueso guardado y descargado." : "GE Grueso guardado.")
      } catch (error: unknown) {
        const msg = await extractApiErrorMessage(error)
        toast.error(`Error guardando GE Grueso: ${msg}`)
      } finally {
        setLoading(false)
      }
    },
    [editingId, form, fr1Auto, fr2Auto],
  )

  const clear = () => {
    if (!window.confirm("Se limpiaran los datos no guardados. ¿Deseas continuar?")) return
    localStorage.removeItem(`${DRAFT_KEY}:${editingId ?? "new"}`)
    setForm(init())
  }

  const text = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/35"
  const topHeaders = ["MUESTRA", "N° OT", "FECHA", "REALIZADO"]

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-50"><Beaker className="h-5 w-5 text-slate-900" /></div>
          <div><h1 className="text-base font-semibold text-slate-900 md:text-lg">GE Grueso - ASTM C127-25</h1><p className="text-xs text-slate-600">Formato fiel a plantilla Excel</p></div>
        </div>

        {loadingEdit ? <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm"><Loader2 className="h-4 w-4 animate-spin" />Cargando ensayo...</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 shadow-sm">
          <div className="space-y-2 border-b border-slate-300 px-3 py-4 text-center"><p className="text-[30px] font-semibold text-slate-800">LABORATORIO DE ENSAYO DE MATERIALES</p><p className="text-2xl font-semibold text-slate-800">FORMATO N° F-LEM-P-AG-28.01</p></div>

          <div className="px-3 py-3"><div className="mx-auto max-w-[560px] overflow-hidden rounded-lg border border-slate-300"><div className="grid grid-cols-4 bg-white text-center text-xs font-semibold">{topHeaders.map((h, i) => <div key={h} className={`${i < 3 ? "border-r border-slate-300" : ""} py-1`}>{h}</div>)}</div><div className="grid grid-cols-4 border-t border-slate-300"><div className="border-r border-slate-300 p-1"><input className={text} value={form.muestra} onChange={(e) => setField("muestra", e.target.value)} onBlur={() => setField("muestra", normMuestra(form.muestra || ""))} autoComplete="off" data-lpignore="true" /></div><div className="border-r border-slate-300 p-1"><input className={text} value={form.numero_ot} onChange={(e) => setField("numero_ot", e.target.value)} onBlur={() => setField("numero_ot", normOt(form.numero_ot || ""))} autoComplete="off" data-lpignore="true" /></div><div className="border-r border-slate-300 p-1"><input className={text} value={form.fecha_ensayo} onChange={(e) => setField("fecha_ensayo", e.target.value)} onBlur={() => setField("fecha_ensayo", ensureFechaEnsayo(normDate(form.fecha_ensayo || "")))} autoComplete="off" data-lpignore="true" /></div><div className="p-1"><input className={text} value={form.realizado_por} onChange={(e) => setField("realizado_por", e.target.value)} autoComplete="off" data-lpignore="true" /></div></div></div></div>

          <div className="border-y border-slate-300 bg-slate-100 px-3 py-2 text-center"><p className="text-[30px] font-semibold text-slate-800">Standard Test Method for Relative Density (Specific Gravity) and Absorption of Coarse Aggregate</p><p className="text-[32px] font-semibold text-slate-800">ASTM C127-25</p></div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-300 p-3 xl:grid-cols-[1.55fr_0.9fr_0.75fr]">
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <div className="border-b border-slate-300 bg-slate-100 py-1 text-center text-xs font-semibold">Descripción de la muestra</div>
              {[
                ["- Tamaño máximo nominal", <input className={text} value={form.tamano_maximo_nominal || ""} onChange={(e) => setField("tamano_maximo_nominal", e.target.value)} autoComplete="off" data-lpignore="true" />],
                ["- Agregado Grupo II(Ligero) (*)", <SiNo value={form.agregado_grupo_ligero_si_no} onChange={(v) => setField("agregado_grupo_ligero_si_no", v)} />],
                ["- Retenido en la malla No 4 (1)", <SiNo value={form.retenido_malla_no4_si_no} onChange={(v) => setField("retenido_malla_no4_si_no", v)} />],
                ["- Retenido en la malla 1 1/2 in (2)", <SiNo value={form.retenido_malla_1_1_2_si_no} onChange={(v) => setField("retenido_malla_1_1_2_si_no", v)} />],
                ["- Fecha/ hora de inmersión Inicial", <input className={text} value={form.fecha_hora_inmersion_inicial || ""} onChange={(e) => setField("fecha_hora_inmersion_inicial", e.target.value)} autoComplete="off" data-lpignore="true" />],
                ["- Fecha/ hora de inmersión Final", <input className={text} value={form.fecha_hora_inmersion_final || ""} onChange={(e) => setField("fecha_hora_inmersion_final", e.target.value)} autoComplete="off" data-lpignore="true" />],
              ].map(([label, control], i) => <div key={label as string} className={`grid grid-cols-[1fr_240px] ${i < 5 ? "border-b border-slate-300" : ""}`}><div className="p-2 text-sm">{label as string}</div><div className="border-l border-slate-300 p-1">{control as JSX.Element}</div></div>)}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-300">
              <div className="grid grid-cols-2 bg-slate-100 text-center text-xs font-semibold"><div className="border-r border-slate-300 py-1">Equipo utilizado</div><div className="py-1">Código</div></div>
              {[
                { label: "Balanza 1 g", key: "equipo_balanza_1g_codigo" as const },
                { label: "Horno 110 °C", key: "equipo_horno_110_codigo" as const },
                { label: "Termómetro 0.1°C", key: "equipo_termometro_01c_codigo" as const },
                { label: "Canastilla", key: "equipo_canastilla_codigo" as const },
                { label: "Tamiz", key: "equipo_tamiz_codigo" as const },
                { label: "Equipo Gravedad Específica", key: "equipo_gravedad_especifica_codigo" as const },
              ].map(({ label, key }, i) => {
                const currentValue = form[key] || "-"
                const options = getEquipmentOptions(currentValue, EQUIPO_OPTIONS[key])
                return (
                  <div key={key} className={`grid grid-cols-2 ${i < 5 ? "border-t border-slate-300" : ""}`}>
                    <div className="border-r border-slate-300 p-2 text-sm">{label}</div>
                    <div className="p-1">
                      <select className={text} value={currentValue} onChange={(e) => setField(key, e.target.value)}>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-300">
              <div className="grid grid-cols-2 bg-slate-100 text-center text-xs font-semibold"><div className="border-r border-slate-300 py-1">TMN<br />(in.)</div><div className="py-1">MASA MINIMA<br />(kg)</div></div>
              {TMN.map(([a, b], i) => <div key={`${a}-${b}`} className={`grid grid-cols-2 text-center text-sm ${i < TMN.length - 1 ? "border-t border-slate-300" : ""}`}><div className="border-r border-slate-300 py-1">{a}</div><div className="py-1">{b}</div></div>)}
              <div className="border-t border-slate-300 py-1 text-center text-xs">Fuente: Norma ASTM C127-24</div>
            </div>
          </div>

          <div className="border-b border-slate-300 px-3 py-2 text-xs">(*) Ejm. Pómez(72h ±4h) - P. Inmersión; (1) Uso de malla No. 4 en el ensayo; (2) Realizar Fraccionamiento &gt;15%.</div>

          <div className="grid grid-cols-1 border-b border-slate-300 xl:grid-cols-2">
            <div className="border-r-0 border-slate-300 p-2 xl:border-r">
              <div className="mb-1 text-sm font-semibold">Condiciones del ensayo</div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_220px] items-center gap-2"><label className="text-sm">- La muestra se secó en horno a masa constante a 110 ± 5°C, antes de saturar</label><SiNo value={form.seco_horno_110_si_no} onChange={(v) => setField("seco_horno_110_si_no", v)} /></div>
                <div className="grid grid-cols-[1fr_220px] items-center gap-2"><label className="text-sm">- La muestra fue ensayada en fracciones</label><SiNo value={form.ensayada_en_fracciones_si_no} onChange={(v) => setField("ensayada_en_fracciones_si_no", v)} /></div>
                <div className="grid grid-cols-[1fr_220px] items-center gap-2"><label className="text-sm">- Malla de fracción</label><input className={text} value={form.malla_fraccion || ""} onChange={(e) => setField("malla_fraccion", e.target.value)} autoComplete="off" data-lpignore="true" /></div>
              </div>
            </div>
            <div className="p-2">
              {[
                ["Masa retenido de malla 1 1/2 in Porcentaje (%)", "masa_retenida_malla_1_1_2_pct"],
                ["Masa de la muestra inicial total (kg)", "masa_muestra_inicial_total_kg"],
                ["Masa de la fracción N°01 (kg)", "masa_fraccion_01_kg"],
                ["Masa de la fracción N°02 (kg)", "masa_fraccion_02_kg"],
              ].map(([label, key]) => <div key={key as string} className="grid grid-cols-[1fr_180px] items-center gap-2 pb-2"><label className="text-sm">{label as string}</label><input type="number" step="any" className={text} value={(form[key as keyof GeGruesoPayload] as number | null | undefined) ?? ""} onChange={(e) => setNum(key as NumericField, e.target.value)} /></div>)}
            </div>
          </div>

          <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-center text-sm font-bold">REPORTE DE DATOS DE ENSAYO</div>
          <Report title="1° Fracción" values={{ a: form.fr1_a_g, b: form.fr1_b_g, c: form.fr1_c_g, d: form.fr1_d_g }} setNum={setNum} totalAuto={fr1Auto} totalValue={form.fr1_masa_total_g ?? null} totalField="fr1_masa_total_g" input={text} />
          <Report title="2° Fracción" values={{ a: form.fr2_a_g, b: form.fr2_b_g, c: form.fr2_c_g, d: form.fr2_d_g }} setNum={setNum} totalAuto={fr2Auto} totalValue={form.fr2_masa_total_g ?? null} totalField="fr2_masa_total_g" input={text} />

          <div className="border-b border-slate-300 px-3 py-2 text-sm"><span className="font-semibold">Nota:</span> La muestra de prueba se enfriará en un período de 1 a 3 horas a temperatura ambiente para agregados hasta 1 1/2 in TMN o hasta que sea manipulable.</div>
          <div className="border-b border-slate-300 p-3"><div className="mb-1 text-sm font-semibold">Observaciones:</div><textarea className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/35" rows={3} value={form.observaciones || ""} onChange={(e) => setField("observaciones", e.target.value)} autoComplete="off" data-lpignore="true" /></div>

          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-100 p-3"><p className="text-sm font-semibold">Revisado:</p><select className={text} value={form.revisado_por || "-"} onChange={(e) => setField("revisado_por", e.target.value)}>{REVISORES.map((x) => <option key={x} value={x}>{x}</option>)}</select><p className="text-sm font-semibold">Fecha:</p><input className={text} value={form.revisado_fecha || ""} onChange={(e) => setField("revisado_fecha", e.target.value)} onBlur={() => setField("revisado_fecha", normDate(form.revisado_fecha || ""))} autoComplete="off" data-lpignore="true" /></div>
            <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-100 p-3"><p className="text-sm font-semibold">Aprobado:</p><select className={text} value={form.aprobado_por || "-"} onChange={(e) => setField("aprobado_por", e.target.value)}>{APROBADORES.map((x) => <option key={x} value={x}>{x}</option>)}</select><p className="text-sm font-semibold">Fecha:</p><input className={text} value={form.aprobado_fecha || ""} onChange={(e) => setField("aprobado_fecha", e.target.value)} onBlur={() => setField("aprobado_fecha", normDate(form.aprobado_fecha || ""))} autoComplete="off" data-lpignore="true" /></div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60" onClick={clear} disabled={loading}><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />Limpiar</span></button>
          <button type="button" className="h-10 rounded-lg border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60" onClick={() => void save(false)} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</button>
          <button type="button" className="h-10 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60" onClick={() => void save(true)} disabled={loading}><span className="inline-flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Guardar y Descargar</span></button>
        </div>
      </div>
    </div>
  )
}
