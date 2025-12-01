import streamlit as st
import pandas as pd
import plotly.express as px
import io

# --- 1. CONFIGURACIÓN VISUAL (DISEÑO AUTOLOAN) ---
st.set_page_config(page_title="AutoLoan Dashboard", layout="wide", page_icon="🚗")

# CSS para forzar el tema Azul Oscuro Profesional
st.markdown("""
<style>
    /* Fondo General */
    .stApp { background-color: #0e1117; }
    
    /* Sidebar */
    [data-testid="stSidebar"] { background-color: #151922; border-right: 1px solid #2d333b; }
    
    /* Tarjetas de KPIs (Estilo Métricas) */
    div[data-testid="metric-container"] {
        background-color: #1e232d;
        border: 1px solid #2d333b;
        padding: 15px;
        border-radius: 8px;
        color: white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    div[data-testid="metric-container"] label { color: #8b949e; font-size: 0.85rem; }
    div[data-testid="metric-container"] div[data-testid="stMetricValue"] { color: #ffffff; font-weight: 700; }
    
    /* Inputs y Tablas */
    .stTextInput input { background-color: #1e232d; color: white; border: 1px solid #30363d; }
    
    /* Botones */
    .stDownloadButton button { background-color: #238636; color: white; border: none; }
    .stDownloadButton button:hover { background-color: #2ea043; }
</style>
""", unsafe_allow_html=True)

# --- 2. LÓGICA DE CARGA INTELIGENTE (FIX DEL EXCEL) ---
@st.cache_data(ttl=3600)
def load_data(uploaded_file):
    if uploaded_file is None: return None
    
    try:
        # Leemos las primeras 10 filas sin encabezado para "escanear" el archivo
        df_preview = pd.read_excel(uploaded_file, header=None, nrows=10)
        
        # BUSCADOR DE ENCABEZADOS:
        # Buscamos en qué fila aparecen las palabras clave "Monto" y "Estado"
        target_row = None
        for i, row in df_preview.iterrows():
            row_text = row.astype(str).str.lower().tolist()
            # Si la fila tiene "monto" Y "estado" (o variaciones), esa es la buena.
            if any("monto" in x for x in row_text) and (any("estado" in x for x in row_text) or any("estatus" in x for x in row_text)):
                target_row = i
                break
        
        if target_row is None:
            # Si falla la búsqueda inteligente, intentamos lo estándar (fila 2)
            target_row = 2

        # Ahora sí, leemos el archivo completo desde la fila correcta
        df = pd.read_excel(uploaded_file, header=target_row)
        df.columns = df.columns.str.strip() # Limpiar espacios en nombres
        
        # MAPEO DE COLUMNAS (Diccionario flexible)
        col_map = {
            'ID': ['ID Solicitud', 'Folio', 'Solicitud', 'id'],
            'CLIENTE': ['Nombre', 'Cliente', 'Solicitante', 'nombre'],
            'MONTO': ['Monto a financiar', 'Monto', 'Importe', 'monto'],
            'ESTADO': ['Estado', 'Estatus', 'estado'],
            'ASESOR': ['Operador coloca', 'Asesor', 'Vendedor', 'operador'],
            'LOTE': ['Lote', 'Agencia', 'lote'],
            'FECHA': ['Fecha de creación', 'Fecha inicio', 'fecha'],
            'NOTAS': ['Notas', 'Comentarios', 'notas']
        }

        # Función para encontrar el nombre real de la columna
        def get_col(key):
            for candidate in col_map[key]:
                # Busca sin importar mayúsculas/minúsculas
                match = next((c for c in df.columns if candidate.lower() == c.lower()), None)
                if match: return match
                # Intenta búsqueda parcial
                match_partial = next((c for c in df.columns if candidate.lower() in c.lower()), None)
                if match_partial: return match_partial
            return None

        # Asignación
        c_id = get_col('ID')
        c_cliente = get_col('CLIENTE')
        c_monto = get_col('MONTO')
        c_estado = get_col('ESTADO')
        c_asesor = get_col('ASESOR')
        c_lote = get_col('LOTE')
        c_fecha = get_col('FECHA')
        c_notas = get_col('NOTAS')

        # Si no encontramos lo básico, retornamos error
        if not c_monto or not c_estado:
            return "ERROR_COLS"

        # LIMPIEZA DE DATOS
        # 1. Montos (Quitar $ y ,)
        if df[c_monto].dtype == 'object':
            df[c_monto] = df[c_monto].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False)
        df[c_monto] = pd.to_numeric(df[c_monto], errors='coerce').fillna(0)
        
        # 2. Fechas
        if c_fecha:
            df[c_fecha] = pd.to_datetime(df[c_fecha], dayfirst=True, errors='coerce')
        
        # 3. Rellenar vacíos
        if c_asesor: df[c_asesor] = df[c_asesor].fillna("Sin Asignar")
        if c_cliente: df[c_cliente] = df[c_cliente].fillna("Cliente General")
        
        # Renombrar para el Dashboard
        rename_dict = {
            c_id: 'ID SOLICITUD', c_cliente: 'CLIENTE', c_monto: 'MONTO',
            c_estado: 'ESTADO', c_asesor: 'ASESOR', c_lote: 'LOTE', c_fecha: 'FECHA'
        }
        if c_notas: rename_dict[c_notas] = 'NOTAS'
        else: df['NOTAS'] = "" # Crear si no existe
            
        df = df.rename(columns=rename_dict)
        return df

    except Exception as e:
        return f"ERROR_GENERICO: {str(e)}"

# --- 3. INTERFAZ PRINCIPAL ---

# Sidebar
with st.sidebar:
    st.header("Filtros")
    uploaded_file = st.file_uploader("Cargar Excel", type=['xlsx'], label_visibility="collapsed")
    st.info("Sube tu archivo para ver el reporte.")
    placeholder_filtros = st.empty()

# Cuerpo
st.title("Dashboard Operativo (Live Edit)")
st.markdown("Los cambios en la tabla actualizan los gráficos en tiempo real")

if uploaded_file:
    result = load_data(uploaded_file)
    
    if isinstance(result, str): # Es un error
        if result == "ERROR_COLS":
            st.error("❌ No pudimos encontrar las columnas 'Monto' o 'Estado'. Por favor verifica que tu Excel tenga encabezados.")
        else:
            st.error(f"❌ Ocurrió un error al leer el archivo: {result}")
            
    elif result is not None:
        df = result # Dataframe cargado con éxito
        
        # --- FILTROS DINÁMICOS ---
        with st.sidebar:
            st.divider()
            lotes_list = sorted(df['LOTE'].astype(str).unique()) if 'LOTE' in df.columns else []
            asesores_list = sorted(df['ASESOR'].astype(str).unique()) if 'ASESOR' in df.columns else []
            
            sel_lote = st.multiselect("Lotes", lotes_list)
            sel_asesor = st.multiselect("Asesores", asesores_list)
        
        # Aplicar Filtros
        df_view = df.copy()
        if sel_lote: df_view = df_view[df_view['LOTE'].isin(sel_lote)]
        if sel_asesor: df_view = df_view[df_view['ASESOR'].isin(sel_asesor)]

        # --- SECCIÓN SUPERIOR: KPIS ---
        # (Se calculan DESPUÉS de la edición para ser reactivos, pero se muestran visualmente aquí usando contenedores)
        kpi_placeholder = st.container()

        # --- EDITOR CENTRAL ---
        st.write("### 🖊️ Editor de Solicitudes")
        
        # Buscador
        search = st.text_input("🔍 Buscar (Nombre, Folio...)", placeholder="Escribe para filtrar...")
        if search:
            mask = df_view.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)
            df_view = df_view[mask]

        # Configuración del Editor
        orden_estatus = ['Solicitud', 'Capturada', 'Mesa de control', 'Análisis', 'Autorizado', 'Entregada', 'Rechazada', 'Cancelado']
        
        df_edited = st.data_editor(
            df_view,
            column_config={
                "MONTO": st.column_config.NumberColumn(format="$%d"),
                "ESTADO": st.column_config.SelectboxColumn(options=orden_estatus, required=True),
                "NOTAS": st.column_config.TextColumn(width="large"),
                "ID SOLICITUD": st.column_config.TextColumn(disabled=True),
                "ASESOR": st.column_config.TextColumn(disabled=True),
            },
            hide_index=True,
            use_container_width=True,
            num_rows="fixed",
            height=400
        )

        # --- CÁLCULOS EN TIEMPO REAL ---
        total_sol = len(df_edited)
        total_monto = df_edited['MONTO'].sum()
        total_fondeado = df_edited[df_edited['ESTADO'] == 'Entregada']['MONTO'].sum()
        
        # Renderizar KPIs
        with kpi_placeholder:
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("TOTAL SOLICITUDES", f"{total_sol}")
            k2.metric("MONTO TOTAL", f"${total_monto:,.0f}")
            k3.metric("TOTAL FONDEADO", f"${total_fondeado:,.0f}")
            # Cálculo simple de días si existe fecha
            if 'FECHA' in df_edited.columns:
                 dias_prom = (pd.Timestamp.now() - df_edited['FECHA']).dt.days.mean()
                 k4.metric("DÍAS PROM. (Activos)", f"{dias_prom:.1f} días")
            else:
                 k4.metric("DÍAS PROM.", "N/A")

        # --- BOTÓN DE DESCARGA ---
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            df_edited.to_excel(writer, index=False)
            
        st.download_button("📥 Descargar Excel Actualizado", data=buffer, file_name="Reporte_Live.xlsx", mime="application/vnd.ms-excel")

else:
    # Pantalla de Bienvenida (Estilo AutoLoan)
    st.info("👈 Para comenzar, carga tu archivo Excel en la barra lateral.")
