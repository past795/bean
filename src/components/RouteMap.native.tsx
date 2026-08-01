import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Stop } from "../types";

export function RouteMap({ stops, dayId }: { stops: Stop[]; dayId: string; days?: { dayId: string; label: string; color: string; stops: Stop[] }[] }) {
  if (stops.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderTitle}>路線座標待補</Text>
        <Text style={styles.placeholderText}>景點確認後會自動繪製順序路線</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      scrollEnabled
      zoomEnabled
      rotateEnabled={false}
      pitchEnabled={false}
      initialRegion={{
        latitude: stops.reduce((sum, stop) => sum + stop.latitude!, 0) / stops.length,
        longitude: stops.reduce((sum, stop) => sum + stop.longitude!, 0) / stops.length,
        latitudeDelta: dayId === "day1" ? 0.16 : 0.12,
        longitudeDelta: 0.16
      }}
    >
      <Polyline
        coordinates={stops.map((stop) => ({ latitude: stop.latitude!, longitude: stop.longitude! }))}
        strokeColor="#E76F51"
        strokeWidth={4}
      />
      {stops.map((stop, index) => (
        <Marker key={stop.id} coordinate={{ latitude: stop.latitude!, longitude: stop.longitude! }}>
          <View style={styles.marker}><Text style={styles.markerText}>{index + 1}</Text></View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 210 },
  placeholder: { height: 210, backgroundColor: "#E5EEE9", alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 36 },
  placeholderTitle: { marginTop: 8, fontWeight: "800", color: "#536783" },
  placeholderText: { marginTop: 4, color: "#6F827A", fontSize: 12 },
  marker: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#E76F51", borderWidth: 3, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },
  markerText: { color: "#FFF", fontWeight: "900", fontSize: 11 }
});
