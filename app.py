import streamlit as st
import pandas as pd
import plotly.express as px
import io

# --- CONFIGURACIÓN DE PÁGINA ---
st.set_page_config(page_title="AutoLoan Dashboard", layout="wide", page_icon="🚗")

# --- ESTILOS CSS (DISEÑO AZUL OSCURO) ---
st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    [data-testid="stSidebar"] { background-color: #151922; border-right: 1px solid #2d333b; }
    div[data-testid="metric-container"] {
        background-color: #1e232d;
        border: 1px solid #2d333b;
        padding: 15px; border-radius: 8px; color: white;
    }
    div[data-testid="metric-container"] label { color: #8b949e; }
    div[data-testid="metric-container"] div[data-testid="stMetricValue"] { color: #ffffff; }
    /* Ajuste para que los mensajes de error no sean tan agresivos */
    .stAlert { background-color: #1e232d; color: white; border: 1px solid #ff4b4b; }
</style>
""", unsafe_allow_html=True)

# --- FUNCIÓN DE CARGA INTELIGENTE ---
@st.cache_data(ttl=3600)
def load_data(uploaded_file):
    if uploaded_file is None: return pd.DataFrame()
    
    # 1. Leer el archivo sin encabezados primero para buscar dónde empiezan
    df_raw = pd.read_excel(uploaded_file, header=None)
    
    # 2. Algoritmo buscador de encabezados
    target_row = None
    for i, row in df_raw.head(10).iterrows():
        row_text = row.astype(str).str.lower().tolist()
        # Buscamos palabras clave que seguro existen en tu excel
        if any("monto" in x for x in row_text) and any("estado" in x for x in row_text):
            target_row = i
            break
            
    if target_row is None:
        return None # No se encontró la estructura
        
    # 3. Recargar usando la fila correcta como encabezado
    df = pd.read_excel(uploaded_file, header=target_row)
    df.columns = df.columns.str.strip() # Quitar espacios extra
    
    # --- MAPEO DE COLUMNAS (Flexible) ---
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

    def get_col(key):
        for candidate in col_map[key]:
            # Busqueda case-insensitive (mayúsculas/minúsculas)
            match = next((c for c in df.columns if candidate.lower() in c.lower()), None)
            if match: return match
        return None

    c_id = get_col('ID')
    c_cliente = get_col('CLIENTE')
    c_monto = get_col('MONTO')
    c_estado = get_col('ESTADO')
    c_asesor = get_col('ASESOR')
    c_lote = get_col('LOTE')
    c_fecha = get_col('FECHA')
    c_notas = get_col('NOTAS')

    if not c_monto or not c_estado:
        return None

    # --- LIMPIEZA ---
    # Limpiar Dinero
    if df[c_monto].dtype == 'object':
        df[c_monto] = df[c_monto].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False)
    df[c_monto] = pd.to_numeric(df[c_monto], errors='coerce').fillna(0)
    
    # Limpiar Fechas
    if c_fecha:
        df[c_fecha] = pd.to_datetime(df[c_fecha], dayfirst=True, errors='coerce')

    # Renombrar columnas para uso interno
    final_cols = {
        c_id: 'ID', c_cliente: 'CLIENTE', c_monto: 'MONTO',
        c_estado: 'ESTADO', c_asesor: 'ASESOR', c_lote: 'LOTE',
        c_fecha: 'FECHA'
    }
    if c_notas: final_cols[c_notas] = 'NOTAS'
    else: df['NOTAS'] = "" # Crear vacía si no existe
        
    df = df.rename(columns=final_cols)
    
    # Asegurarnos de que existan todas
    required = ['ID', 'CLIENTE', 'MONTO', 'ESTADO', 'ASESOR', 'LOTE', 'FECHA', 'NOTAS']
    for col in required:
        if col not in df.columns: df[col] = "Sin Dato"
            
    return df

# --- INTERFAZ ---
with st.sidebar:
    st.header("📂 Archivo")
    uploaded_file = st.file_uploader("Cargar Excel", type=['xlsx'])

st.title("Dashboard Operativo (Live Edit)")

if uploaded_file:
    df = load_data(uploaded_file)
    
    if df is not None:
        # --- FILTROS ---
        col1, col2, col3 = st.columns(3)
        lotes = st.sidebar.multiselect("Lotes", sorted(df['LOTE'].astype(str).unique()))
        asesores = st.sidebar.multiselect("Asesores", sorted(df['ASESOR'].astype(str).unique()))
        
        df_view = df.copy()
        if lotes: df_view = df_view[df_view['LOTE'].isin(lotes)]
        if asesores: df_view = df_view[df_view['ASESOR'].isin(asesores)]
        
        # --- EDITOR ---
        st.write("### 📝 Editor Interactivo")
        df_edited = st.data_editor(
            df_view,
            num_rows="fixed",
            use_container_width=True,
            hide_index=True,
            column_config={
                "MONTO": st.column_config.NumberColumn(format="$%d"),
                "ESTADO": st.column_config.SelectboxColumn(options=[
                    'Solicitud', 'Capturada', 'Mesa de control', 'Análisis', 
                    'Autorizado', 'Entregada', 'Rechazada', 'Cancelado'
                ], required=True)
            }
        )
        
        # --- KPIS EN TIEMPO REAL ---
        total = len(df_edited)
        monto = df_edited['MONTO'].sum()
        fondeado = df_edited[df_edited['ESTADO'] == 'Entregada']['MONTO'].sum()
        
        k1, k2, k3 = st.columns(3)
        k1.metric("Solicitudes", total)
        k2.metric("Monto Cartera", f"${monto:,.0f}")
        k3.metric("Fondeado (Entregada)", f"${fondeado:,.0f}")
        
        # --- GRÁFICAS ---
        c1, c2 = st.columns([2,1])
        
        # Barras
        conteo_mensual = df_edited.copy()
        if 'FECHA' in df_edited.columns and pd.api.types.is_datetime64_any_dtype(df_edited['FECHA']):
            conteo_mensual['Mes'] = df_edited['FECHA'].dt.strftime('%Y-%m')
            grafico_bar = px.bar(conteo_mensual.groupby(['Mes', 'ESTADO']).size().reset_index(name='Count'), 
                   x='Mes', y='Count', color='ESTADO', title="Evolución Mensual", barmode='group')
            grafico_bar.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font_color='white')
            c1.plotly_chart(grafico_bar, use_container_width=True)
        else:
            c1.warning("No se detectó columna de Fecha válida para la gráfica temporal.")

        # Pastel
        grafico_pie = px.pie(df_edited, names='ESTADO', title="Distribución", hole=0.4)
        grafico_pie.update_layout(font_color='white')
        c2.plotly_chart(grafico_pie, use_container_width=True)
        
    else:
        st.error("⚠️ No pudimos leer las columnas. Por favor, abre tu Excel y asegúrate de que existan columnas que contengan las palabras 'Monto' y 'Estado' en la fila 1, 2 o 3.")
        st.info("Tip: Sube el archivo original sin modificar.")

else:
    st.info("👈 Sube tu archivo en la barra lateral.")
