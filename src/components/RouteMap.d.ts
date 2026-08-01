import { Stop } from "../types";
import type React from "react";

export type RouteMapDay = { dayId: string; label: string; color: string; stops: Stop[] };
export function RouteMap(props: { stops: Stop[]; dayId: string; days?: RouteMapDay[] }): React.JSX.Element;
