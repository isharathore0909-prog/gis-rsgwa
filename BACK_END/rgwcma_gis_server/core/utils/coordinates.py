import math

def utm_to_latlon(easting, northing):
    """Manual UTM to LatLon logic from MIS_RSGWA"""
    sa, sb = 6378137.0, 6356752.314245
    e2 = math.sqrt((sa**2) - (sb**2)) / sb
    e2sq, c = e2**2, sa**2 / sb
    x, y = easting - 500000, northing
    lon0 = (43 * 6 - 183) * math.pi / 180
    M = y / 0.9996
    phi = M / 6367449.1458
    e = (1 - sb / sa) / (1 + sb / sa)
    lat = phi + (3 * e / 2 - 27 * e**3 / 32) * math.sin(2 * phi) + (21 * e**2 / 16 - 55 * e**4 / 32) * math.sin(4 * phi) + (151 * e**3 / 96) * math.sin(6 * phi)
    N = c / math.sqrt(1 + e2sq * (math.cos(lat)**2))
    T, C = (math.tan(lat)**2), e2sq * (math.cos(lat)**2)
    R = c * (1 - e2sq) / ((1 + e2sq * (math.cos(lat)**2))**1.5)
    D = x / (N * 0.9996)
    latitude = lat - (N * math.tan(lat) / R) * (D**2 / 2 - (5 + 3 * T + 10 * C - 4 * C**2 - 9 * e2sq) * D**4 / 24 + (61 + 90 * T + 298 * C + 45 * T**2 - 252 * e2sq - 3 * C**2) * D**6 / 720)
    longitude = lon0 + (D - (1 + 2 * T + C) * D**3 / 6 + (5 - 2 * C + 28 * T - 3 * C**2 + 8 * e2sq + 24 * T**2) * D**5 / 120) / math.cos(lat)
    return [longitude * 180 / math.pi, latitude * 180 / math.pi]
