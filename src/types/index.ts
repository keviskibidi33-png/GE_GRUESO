export type SiNoFlag = "-" | "SI" | "NO"

export interface GeGruesoPayload {
    muestra: string
    numero_ot: string
    fecha_ensayo: string
    realizado_por: string

    tamano_maximo_nominal?: string | null
    agregado_grupo_ligero_si_no?: SiNoFlag
    retenido_malla_no4_si_no?: SiNoFlag
    retenido_malla_1_1_2_si_no?: SiNoFlag
    fecha_hora_inmersion_inicial?: string | null
    fecha_hora_inmersion_final?: string | null

    equipo_balanza_1g_codigo?: string | null
    equipo_horno_110_codigo?: string | null
    equipo_termometro_01c_codigo?: string | null
    equipo_canastilla_codigo?: string | null
    equipo_tamiz_codigo?: string | null
    equipo_gravedad_especifica_codigo?: string | null

    seco_horno_110_si_no?: SiNoFlag
    ensayada_en_fracciones_si_no?: SiNoFlag
    malla_fraccion?: string | null

    masa_retenida_malla_1_1_2_pct?: number | null
    masa_muestra_inicial_total_kg?: number | null
    masa_fraccion_01_kg?: number | null
    masa_fraccion_02_kg?: number | null

    fr1_a_g?: number | null
    fr1_b_g?: number | null
    fr1_c_g?: number | null
    fr1_d_g?: number | null
    fr1_masa_total_g?: number | null

    fr2_a_g?: number | null
    fr2_b_g?: number | null
    fr2_c_g?: number | null
    fr2_d_g?: number | null
    fr2_masa_total_g?: number | null

    observaciones?: string | null
    revisado_por?: string | null
    revisado_fecha?: string | null
    aprobado_por?: string | null
    aprobado_fecha?: string | null
}

export interface GeGruesoEnsayoSummary {
    id: number
    numero_ensayo: string
    numero_ot: string
    cliente?: string | null
    muestra?: string | null
    fecha_documento?: string | null
    estado: string
    masa_muestra_inicial_total_kg?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}

export interface GeGruesoEnsayoDetail extends GeGruesoEnsayoSummary {
    payload?: GeGruesoPayload | null
}

export interface GeGruesoSaveResponse {
    id: number
    numero_ensayo: string
    numero_ot: string
    estado: string
    masa_muestra_inicial_total_kg?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}
