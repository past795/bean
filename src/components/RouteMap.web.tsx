import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stop } from "../types";

const MAP_HEIGHT = 300;

const escapeForHtml = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export function RouteMap({ stops }: { stops: Stop[]; dayId: string }) {
  const located = useMemo(
    () => stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)),
    [stops]
  );

  if (located.length === 0) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.placeholderIcon}><Text style={styles.placeholderEmoji}>⌖</Text></View>
        <Text style={styles.placeholderTitle}>這一天還沒有景點座標</Text>
        <Text style={styles.placeholderText}>景點補上地址與座標後，這裡就會顯示可縮放地圖</Text>
      </View>
    );
  }

  const points = located.map((stop, index) => ({
    latitude: stop.latitude!,
    longitude: stop.longitude!,
    title: stop.title,
    number: index + 1
  }));

  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=yes">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;margin:0;background:#e7eeea}
.leaflet-control-attribution{font-size:8px}
.bean-pin{width:30px;height:30px;border-radius:50%;background:#183f39;color:white;border:3px solid white;display:flex;align-items:center;justify-content:center;font:900 12px Arial;box-shadow:0 3px 8px rgba(16,46,41,.3)}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const points=${escapeForHtml(points)};
const map=L.map('map',{zoomControl:true,scrollWheelZoom:true,touchZoom:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const latlngs=points.map(p=>[p.latitude,p.longitude]);
points.forEach(p=>{
  const icon=L.divIcon({className:'',html:'<div class="bean-pin">'+p.number+'</div>',iconSize:[36,36],iconAnchor:[18,18]});
  L.marker([p.latitude,p.longitude],{icon}).addTo(map).bindPopup('<b>'+String(p.title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</b>');
});
if(latlngs.length>1){L.polyline(latlngs,{color:'#f06449',weight:5,opacity:.9}).addTo(map);map.fitBounds(latlngs,{padding:[35,35]});}
else{map.setView(latlngs[0],15);}
</script></body></html>`;

  return React.createElement("iframe" as any, {
    title: "今日景點互動地圖",
    srcDoc: html,
    style: { width: "100%", height: MAP_HEIGHT, border: 0, display: "block" },
    sandbox: "allow-scripts allow-same-origin"
  });
}

const styles = StyleSheet.create({
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
  placeholderEmoji: { color: "#315248", fontSize: 25, fontWeight: "900" },
  placeholderTitle: { marginTop: 12, fontWeight: "900", fontSize: 15, color: "#274940" },
  placeholderText: { marginTop: 5, color: "#718078", fontSize: 11, textAlign: "center", lineHeight: 17 }
});
