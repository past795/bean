from io import BytesIO
from math import atan, exp, log, pi, sin
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

TILE_SIZE = 256
ZOOM = 11
OUTPUT_WIDTH = 520
OUTPUT_HEIGHT = 260

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)


def project(latitude: float, longitude: float) -> tuple[float, float]:
    scale = (2**ZOOM) * TILE_SIZE
    sin_lat = sin(latitude * pi / 180)
    x = (longitude + 180) / 360 * scale
    y = (0.5 - log((1 + sin_lat) / (1 - sin_lat)) / (4 * pi)) * scale
    return x, y


def unproject(x: float, y: float) -> tuple[float, float]:
    scale = (2**ZOOM) * TILE_SIZE
    longitude = x / scale * 360 - 180
    n = pi - 2 * pi * y / scale
    latitude = 180 / pi * atan(0.5 * (exp(n) - exp(-n)))
    return latitude, longitude


def fetch_tile(tile_x: int, tile_y: int) -> Image.Image:
    url = f"https://tile.openstreetmap.org/{ZOOM}/{tile_x}/{tile_y}.png"
    request = Request(url, headers={"User-Agent": "BusanTripPersonalPrototype/0.1"})
    with urlopen(request, timeout=30) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def build_map(name: str, coordinates: list[tuple[float, float]]) -> None:
    points = [project(latitude, longitude) for latitude, longitude in coordinates]
    min_x = min(point[0] for point in points)
    max_x = max(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_y = max(point[1] for point in points)
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    left = center_x - OUTPUT_WIDTH / 2
    top = center_y - OUTPUT_HEIGHT / 2

    start_tile_x = int(left // TILE_SIZE)
    end_tile_x = int((left + OUTPUT_WIDTH) // TILE_SIZE)
    start_tile_y = int(top // TILE_SIZE)
    end_tile_y = int((top + OUTPUT_HEIGHT) // TILE_SIZE)

    canvas = Image.new(
        "RGB",
        (
            (end_tile_x - start_tile_x + 1) * TILE_SIZE,
            (end_tile_y - start_tile_y + 1) * TILE_SIZE,
        ),
    )

    for tile_y in range(start_tile_y, end_tile_y + 1):
        for tile_x in range(start_tile_x, end_tile_x + 1):
            tile = fetch_tile(tile_x, tile_y)
            canvas.paste(
                tile,
                ((tile_x - start_tile_x) * TILE_SIZE, (tile_y - start_tile_y) * TILE_SIZE),
            )

    crop_left = int(left - start_tile_x * TILE_SIZE)
    crop_top = int(top - start_tile_y * TILE_SIZE)
    output = canvas.crop(
        (crop_left, crop_top, crop_left + OUTPUT_WIDTH, crop_top + OUTPUT_HEIGHT)
    )
    output.save(ASSETS / f"{name}.png", optimize=True)

    north, west = unproject(left, top)
    south, east = unproject(left + OUTPUT_WIDTH, top + OUTPUT_HEIGHT)
    print(
        f"{name}: west={west:.8f}, east={east:.8f}, north={north:.8f}, south={south:.8f}"
    )


build_map(
    "busan-day1-map",
    [
        (35.1796, 128.9382),
        (35.1119, 129.0352),
        (35.1152, 129.0422),
        (35.0787, 129.0443),
        (35.0778, 129.0450),
        (35.0526, 129.0872),
        (35.0900, 129.0397),
        (35.0987, 129.0306),
        (35.0980, 129.0367),
        (35.0967, 129.0304),
    ],
)

build_map(
    "busan-day2-map",
    [
        (35.1457, 129.0654),
        (35.1587, 129.1716),
        (35.1604, 129.1915),
        (35.1600, 129.1920),
        (35.1614, 129.1908),
        (35.1587, 129.1604),
        (35.1596, 129.1691),
        (35.1531, 129.1324),
        (35.1532, 129.1187),
    ],
)
