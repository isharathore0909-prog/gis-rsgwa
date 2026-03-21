# Palettes (Synced with frontend constants)
BLUE_PALETTE = [
    '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', 
    '#0369a1', '#075985', '#0c4a6e', '#1e40af', '#1e3a8a', '#172554', '#042f2e'
]

AQUIFER_COLORS = {
    'Younger Alluvium': '#f9eb0f', 'Older Alluvium': '#f8b195', 'Alluvium': '#4caf50',
    'Sandstone': '#f3722c', 'Schist': '#d84315', 'Phyllite & Schist': '#d84315',
    'Limestone': '#90caf9', 'Quartzite': '#81d4fa', 'Granite': '#ce93d8',
    'Basalt': '#9575cd', 'Gneiss': '#b39ddb', 'Phyllite': '#ffab91',
    'Shale': '#a9a9a9', 'Hills': '#808080', 'Hilly Area': '#808080'
}

GWRE_COLORS = {
    'safe': '#28a745', 'semi': '#ffc107', 'critical': '#fd7e14', 'over': '#dc3545',
    'saline': '#6c757d', 'default': '#3388ff'
}

LAYER_STYLES = {
    'rivers':      {'color': '#334155', 'linewidth': 0.8, 'zorder': 5, 'label': 'Rivers'},
    'canals':      {'color': '#00bcd4', 'linewidth': 0.7, 'zorder': 5, 'label': 'Canals'},
    'waterbodies': {'color': '#3b82f6', 'edgecolor': '#1d4ed8', 'linewidth': 0.3, 'zorder': 4, 'label': 'Water Bodies'},
    'dams':        {'color': '#0ea5e9', 'markersize': 15, 'zorder': 10, 'label': 'Dams'},
    'micro':       {'facecolor': 'none', 'edgecolor': '#8b5cf6', 'linewidth': 0.5, 'linestyle': '--', 'zorder': 3, 'label': 'Micro Watershed'},
    'district':    {'facecolor': 'none', 'edgecolor': '#64748b', 'linewidth': 1.0, 'zorder': 20, 'label': 'District Boundary'},
    'block':       {'facecolor': 'none', 'edgecolor': '#94a3b8', 'linewidth': 0.6, 'zorder': 18, 'label': 'Block Boundary'},
    'grampanchayat':{'facecolor': 'none', 'edgecolor': '#cbd5e1', 'linewidth': 0.4, 'zorder': 16, 'label': 'GP Boundary'},
    'village':     {'facecolor': 'none', 'edgecolor': '#e2e8f0', 'linewidth': 0.2, 'zorder': 15, 'label': 'Village Boundary'},
    'state':       {'facecolor': 'none', 'edgecolor': '#334155', 'linewidth': 1.5, 'zorder': 25, 'label': 'Rajasthan State'},
}

def get_style(layer_name):
    """Return dict of matplotlib style arguments."""
    return LAYER_STYLES.get(layer_name, {'color': '#666666', 'linewidth': 0.5, 'zorder': 1})
