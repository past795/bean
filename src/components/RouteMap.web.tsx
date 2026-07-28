import React, { useMemo, useState } from "react";
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Stop } from "../types";

const ZOOM = 11;
const TILE = 256;
const MAP_HEIGHT = 260;

const maps = {
  day1: {
    image: require("../../assets/busan-day1-map.png"),
    west: 128.83417217,
    east: 129.19122783,
    north: 35.18910882,
    south: 35.04307524
  },
  day2: {
    image: require("../../assets/busan-day2-map.png"),
    west: 128.95017217,
    east: 129.30722783,
    north: 35.22650088,
    south: 35.08053441
  }
} as const;

function project(latitude: number, longitude: number) {
  const scale = Math.pow(2, ZOOM) * TILE;
  const sin = Math.sin(latitude * Math.PI / 180);
  return {
    x: (longitude + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  };
}

export function RouteMap({ stops, dayId }: { stops: Stop[]; dayId: string }) {
  const [width, setWidth] = useState(430);
  const located = useMemo(
    () => stops.filter((stop) => stop.latitude != null && stop.longitude != null),
    [stops]
  );

  const mapConfig = maps[dayId as keyof typeof maps];

  if (located.length < 2 || !mapConfig) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.placeholderIcon}><Text style={styles.placeholderEmoji}>⌖</Text></View>
        <Text style={styles.placeholderTitle}>正在整理精確路線</Text>
        <Text style={styles.placeholderText}>確認景點座標後，這裡會顯示真實地圖與交通動線</Text>
      </View>
    );
  }

  const topLeft = project(mapConfig.north, mapConfig.west);
  const bottomRight = project(mapConfig.south, mapConfig.east);
  const screenPoints = located.map((stop) => {
    const point = project(stop.latitude!, stop.longitude!);
    return {
      x: (point.x - topLeft.x) / (bottomRight.x - topLeft.x) * width,
      y: (point.y - topLeft.y) / (bottomRight.y - topLeft.y) * MAP_HEIGHT
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - width) > 1) setWidth(nextWidth);
  };

  return (
    <View style={styles.map} onLayout={onLayout}>
      <Image source={mapConfig.image} resizeMode="stretch" style={styles.mapImage} />

      <View style={styles.mapTint} pointerEvents="none" />

      {screenPoints.slice(0, -1).map((from, index) => {
        const to = screenPoints[index + 1]!;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View
            key={`route-${located[index]!.id}`}
            style={[
              styles.routeHalo,
              {
                left: from.x,
                top: from.y,
                width: length,
                transform: [{ rotate: `${angle}deg` }]
              }
            ]}
          >
            <View style={styles.routeLine} />
          </View>
        );
      })}

      {located.map((stop, index) => {
        const point = screenPoints[index]!;
        return (
          <Pressable
            key={stop.id}
            accessibilityLabel={`第 ${index + 1} 站：${stop.title}`}
            style={[styles.pinWrap, { left: point.x - 16, top: point.y - 16 }]}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{index + 1}</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>{located.length} 個地點</Text>
        <Text style={styles.legendSub}>依目前順序連線</Text>
      </View>
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>© OpenStreetMap</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: MAP_HEIGHT,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#DCE8E8"
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: MAP_HEIGHT
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250,247,240,.12)"
  },
  routeHalo: {
    position: "absolute",
    height: 8,
    marginTop: -4,
    transformOrigin: "left center" as never,
    backgroundColor: "rgba(255,255,255,.92)",
    borderRadius: 4,
    zIndex: 2,
    justifyContent: "center"
  },
  routeLine: {
    height: 4,
    marginHorizontal: 1,
    borderRadius: 2,
    backgroundColor: "#F06449"
  },
  pinWrap: {
    position: "absolute",
    width: 32,
    height: 32,
    zIndex: 4
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#183F39",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#102E29",
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 }
  },
  pinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11
  },
  legend: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,.94)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 5,
    shadowColor: "#173A34",
    shadowOpacity: 0.12,
    shadowRadius: 8
  },
  legendTitle: {
    color: "#193D37",
    fontWeight: "900",
    fontSize: 12
  },
  legendSub: {
    color: "#76847F",
    fontSize: 9,
    marginTop: 2
  },
  attribution: {
    position: "absolute",
    right: 6,
    bottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,.75)"
  },
  attributionText: {
    color: "#596661",
    fontSize: 8
  },
  placeholder: {
    height: MAP_HEIGHT,
    backgroundColor: "#E7EEEA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },
  placeholderIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#D5E3DD",
    alignItems: "center",
    justifyContent: "center"
  },
  placeholderEmoji: {
    color: "#315248",
    fontSize: 25,
    fontWeight: "900"
  },
  placeholderTitle: {
    marginTop: 12,
    fontWeight: "900",
    fontSize: 15,
    color: "#274940"
  },
  placeholderText: {
    marginTop: 5,
    color: "#718078",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17
  }
});
