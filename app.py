import streamlit as st
import pandas as pd
import plotly.express as px
import io

# --- CONFIGURACIÓN DE PÁGINA Y TEMA ---
st.set_page_config(page_title="AutoLoan Dashboard", layout="wide", page_icon="🚗")

# ESTILOS CSS PERSONALIZADOS (Para imitar el diseño Dark Blue)
st.markdown("""
<style>
    /* Fondo General */
    .stApp {
        background-color: #0e1117;
    }
    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #151922;
        border-right: 1px solid #2d333b;
    }
    /* Tarjetas de KPIs */
    div[data-testid="metric-container"] {
        background-color: #1e232d;
        border: 1px solid #2d333b;
        padding: 15px;
        border-radius: 8px;
        color: white;
    }
    /* Títulos de Métricas */
    div[data-testid="metric-container"] label {
        color: #8b949e;
        font-size: 0.9rem;
    }
    /* Valores de Métricas */
    div[data-testid="metric-container"] div[data-testid="stMetricValue"] {
        color: #ffffff;
        font-weight: 700;
    }
    /* Input de Búsqueda */
    .stTextInput input {
        background-color: #1e232d;
        color: white;
        border: 1px solid #2d333b;
    }
    /* Botón Excel */
    .stDownloadButton button {
        background-color: #238636;
        color: white;
        border: none;
    }
</style>
""", unsafe_allow_html=True)

# --- FUNCIÓN DE CARGA DE DATOS (Robusta) ---
@st.cache_data(ttl=3600)
def load_data(uploaded_file):
    if uploaded_file is None:
        return pd.DataFrame()
    
    # Intentar leer saltando encabezados decorativos
    try:
        df = pd.read_excel(uploaded_file, header=2) 
    except:
        df = pd.read_excel(uploaded_file, header=1)

    # Limpieza básica de nombres de columnas
    df.columns = df.columns.str.strip()
    
    # MAPEO DE COLUMNAS (Para que coincida con tu Excel real)
    # Ajusta los nombres de la lista derecha según tu Excel exacto
    col_map = {
        'ID': ['ID Solicitud', 'Folio', 'Solicitud'],
        'CLIENTE': ['Nombre', 'Cliente', 'Solicitante'],
        'MONTO': ['Monto a financiar', 'Monto', 'Importe'],
        'ESTADO': ['Estado', 'Estatus'],
        'ASESOR': ['Operador coloca', 'Asesor', 'Vendedor'],
        'LOTE': ['Lote', 'Agencia'],
        'FECHA': ['Fecha de creación', 'Fecha'],
        'FECHA_FIN': ['Último cambio de estado', 'Fecha fin'],
        'NOTAS': ['Notas', 'Comentarios']
    }

    def get_col(key):
        for candidate in col_map[key]:
            if candidate in df.columns:
                return candidate
        return None

    # Asignar columnas encontradas
    c_id = get_col('ID')
    c_cliente = get_col('CLIENTE')
    c_monto = get_col('MONTO')
    c_estado = get_col('ESTADO')
    c_asesor = get_col('ASESOR')
    c_lote = get_col('LOTE')
    c_fecha = get_col('FECHA')
    c_fecha_fin = get_col('FECHA_FIN')
    c_notas = get_col('NOTAS')

    # Validar columnas críticas
    if not c_monto or not c_estado:
        return pd.DataFrame() # Retorna vacío si falla

    # --- LIMPIEZA DE VALORES ---
    # 1. Montos
    if df[c_monto].dtype == 'object':
        df[c_monto] = df[c_monto].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False)
        df[c_monto] = pd.to_numeric(df[c_monto], errors='coerce').fillna(0)
    
    # 2. Fechas y Días
    if c_fecha:
        df[c_fecha] = pd.to_datetime(df[c_fecha], dayfirst=True, errors='coerce')
        
    # Cálculo de Días (Fecha Fin - Fecha Inicio)
    if c_fecha and c_fecha_fin:
        df[c_fecha_fin] = pd.to_datetime(df[c_fecha_fin], dayfirst=True, errors='coerce')
        # Si no hay fecha fin, usar HOY para calcular días abiertos
        fecha_cierre = df[c_fecha_fin].fillna(pd.Timestamp.now())
        df['Dias_Calculados'] = (fecha_cierre - df[c_fecha]).dt.days
        df['Dias_Calculados'] = df['Dias_Calculados'].fillna(0).astype(int).apply(lambda x: x if x >= 0 else 0)
    else:
        df['Dias_Calculados'] = 0

    # 3. Rellenar vacíos
    if c_asesor: df[c_asesor] = df[c_asesor].fillna("Sin Asignar")
    if c_cliente: df[c_cliente] = df[c_cliente].fillna("Desconocido")
    if not c_notas: df['Notas_Sistema'] = "" 
    else: df['Notas_Sistema'] = df[c_notas].fillna("").astype(str)

    # Renombrar para estandarizar
    final_cols = {
        c_id: 'ID SOLICITUD',
        c_cliente: 'CLIENTE',
        c_monto: 'MONTO',
        c_estado: 'ESTADO',
        c_asesor: 'ASESOR',
        c_lote: 'LOTE',
        c_fecha: 'FECHA_CREACION'
    }
    if c_notas: final_cols[c_notas] = 'NOTAS'
    else: final_cols['Notas_Sistema'] = 'NOTAS'

    df = df.rename(columns=final_cols)
    return df

# --- INTERFAZ DE USUARIO ---

# 1. SIDEBAR (FILTROS)
with st.sidebar:
    st.header("Filtros")
    uploaded_file = st.file_uploader("Cargar Excel", type=['xlsx'], label_visibility="collapsed")
    
    st.divider()
    
    # Placeholders para filtros (se llenan al cargar datos)
    container_filtros = st.container()

# 2. CUERPO PRINCIPAL
st.title("Dashboard Operativo (Live Edit)")
st.markdown("Los cambios en la tabla actualizan los gráficos en tiempo real")

if uploaded_file:
    df = load_data(uploaded_file)
    
    if not df.empty:
        # --- LOGICA DE FILTROS ---
        with container_filtros:
            st.subheader("Configuración")
            # Fechas
            min_d = df['FECHA_CREACION'].min()
            max_d = df['FECHA_CREACION'].max()
            fechas = st.date_input("Rango de Fechas", [min_d, max_d])
            
            # Lotes
            lotes = sorted(df['LOTE'].astype(str).unique())
            sel_lotes = st.multiselect("Lotes", lotes)
            
            # Asesores
            asesores = sorted(df['ASESOR'].astype(str).unique())
            sel_asesores = st.multiselect("Asesores", asesores)

        # Aplicar Filtros
        df_view = df.copy()
        if sel_lotes:
            df_view = df_view[df_view['LOTE'].isin(sel_lotes)]
        if sel_asesores:
            df_view = df_view[df_view['ASESOR'].isin(sel_asesores)]
        if len(fechas) == 2:
            df_view = df_view[
                (df_view['FECHA_CREACION'].dt.date >= fechas[0]) &
                (df_view['FECHA_CREACION'].dt.date <= fechas[1])
            ]

        # --- SECCIÓN DE KPIS (Placeholder vacío, se llena post-edición) ---
        kpi_container = st.container()

        # --- ÁREA DE EDICIÓN ---
        st.write("### 📝 Editor de Solicitudes (Live)")
        
        # Buscador
        busqueda = st.text_input("🔍 Buscar Cliente (Nombre, Folio o Asesor)...", placeholder="Escribe para filtrar...")
        if busqueda:
            df_view = df_view[
                df_view['CLIENTE'].str.contains(busqueda, case=False, na=False) |
                df_view['ID SOLICITUD'].str.contains(busqueda, case=False, na=False) |
                df_view['ASESOR'].str.contains(busqueda, case=False, na=False)
            ]

        # TABLA EDITABLE (El corazón de la app)
        # Lista de estados ordenada lógicamente
        orden_estados = [
            'Solicitud', 'Capturada', 'Mesa de control', 'Revisión análisis', 
            'Análisis', 'Visita', 'Autorizado', 'Contrato', 
            'Entregada', 'Rechazada', 'Cancelado'
        ]

        df_edited = st.data_editor(
            df_view,
            column_config={
                "ID SOLICITUD": st.column_config.TextColumn(disabled=True),
                "CLIENTE": st.column_config.TextColumn("CLIENTE (EDITABLE)"),
                "ESTADO": st.column_config.SelectboxColumn(
                    "ESTADO (EDITABLE)",
                    options=orden_estados,
                    required=True,
                    width="medium"
                ),
                "MONTO": st.column_config.NumberColumn(
                    "MONTO (EDITABLE)",
                    format="$%d",
                    min_value=0
                ),
                "NOTAS": st.column_config.TextColumn(
                    "NOTAS (EDITABLE)",
                    width="large"
                ),
                "ASESOR": st.column_config.TextColumn(disabled=True),
                "LOTE": st.column_config.TextColumn(disabled=True),
                "FECHA_CREACION": st.column_config.DatetimeColumn(disabled=True, format="D/M/Y"),
                "Dias_Calculados": st.column_config.NumberColumn("Días", disabled=True)
            },
            hide_index=True,
            use_container_width=True,
            num_rows="fixed",
            height=500
        )

        # --- CÁLCULO DE KPIS (Basado en df_edited) ---
        total_sol = len(df_edited)
        total_monto = df_edited['MONTO'].sum()
        
        fondeados = df_edited[df_edited['ESTADO'] == 'Entregada']
        total_fond = fondeados['MONTO'].sum()
        
        prom_dias = df_edited['Dias_Calculados'].mean()

        # Renderizar KPIs en el contenedor de arriba
        with kpi_container:
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("TOTAL SOLICITUDES", f"{total_sol}", "Volumen Procesado")
            c2.metric("MONTO TOTAL", f"${total_monto:,.0f}", "Valor Cartera")
            c3.metric("TOTAL FONDEADO", f"${total_fond:,.0f}", "Solo 'Entregada'")
            c4.metric("PROM. DÍAS FONDEO", f"{prom_dias:.1f} días", "Eficiencia")

        # --- BOTÓN DE DESCARGA ---
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            df_edited.to_excel(writer, index=False, sheet_name='Reporte_Editado')
            
        st.download_button(
            label="📥 Descargar Excel Actualizado",
            data=buffer,
            file_name="Reporte_Credimovil_Live.xlsx",
            mime="application/vnd.ms-excel"
        )
        
    else:
        st.error("No se pudieron leer las columnas clave (Monto, Estado). Revisa el formato.")

else:
    # Pantalla Vacía (Placeholder visual)
    st.info("👈 Carga tu archivo Excel en la barra lateral para comenzar.")
