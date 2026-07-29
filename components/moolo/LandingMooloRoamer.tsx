"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import {
  MooloMascot,
  type MooloMascotState,
} from "@/components/moolo/MooloMascot";
import { useTranslation } from "@/hooks/useTranslation";

type RoamPhase =
  | "idle"
  | "looking"
  | "starting"
  | "roaming"
  | "pausing"
  | "turning"
  | "landing"
  | "exiting";

type RoamMode = "ambient" | "click";
type RoamProfileName = "desktop" | "tablet" | "mobile" | "compact";

interface RoamPoint {
  x: number;
  y: number;
}

interface RoamRegion {
  name: string;
  x: readonly [number, number];
  y: readonly [number, number];
}

interface SafetyZone {
  label: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface RoamBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Geometry {
  stageRect: DOMRect;
  mascotWidth: number;
  mascotHeight: number;
  collisionWidth: number;
  collisionHeight: number;
  bounds: RoamBounds;
  forbiddenZones: SafetyZone[];
}

interface RoamProfile {
  name: RoamProfileName;
  enabled: boolean;
  waypointMin: number;
  waypointMax: number;
  normalSpeed: readonly [number, number];
  dashSpeed: readonly [number, number];
  maxDashCount: number;
  restDelay: readonly [number, number];
  firstDelay: readonly [number, number];
  roamDuration: readonly [number, number];
  minSegmentDistance: number;
  preferredSegmentDistance: readonly [number, number];
}

interface PlannedPoint extends RoamPoint {
  dash: boolean;
  edgeTurn: boolean;
  pause: boolean;
  playfulHop: boolean;
}

interface LandingMooloRoamerProps {
  state?: MooloMascotState;
  exiting?: boolean;
}

const EDGE_PADDING = 24;
const HEADER_SAFE_AREA = 72;
const BOTTOM_SAFE_AREA = 28;
const MAX_WAYPOINT_ATTEMPTS = 20;
const smoothEase = [0.45, 0, 0.55, 1] as const;
const settleEase = [0.22, 1, 0.36, 1] as const;
const roamingStates = new Set<MooloMascotState>(["idle", "safe"]);

const restAnchors = [
  { xRatio: 0.78, yRatio: 0.46 },
  { xRatio: 0.86, yRatio: 0.68 },
  { xRatio: 0.34, yRatio: 1 },
] as const;

const desktopRegions: RoamRegion[] = [
  { name: "left-crossing", x: [0.29, 0.4], y: [1, 1] },
  { name: "right-crossing", x: [0.82, 0.96], y: [1, 1] },
  { name: "left-top", x: [0.02, 0.22], y: [0.04, 0.28] },
  { name: "right-top", x: [0.76, 0.98], y: [0.04, 0.3] },
  { name: "left-bottom", x: [0.02, 0.28], y: [0.7, 0.98] },
  { name: "right-bottom", x: [0.72, 0.98], y: [0.68, 0.98] },
  { name: "center", x: [0.38, 0.64], y: [0.38, 0.7] },
  { name: "left-edge", x: [0, 0.12], y: [0.32, 0.68] },
  { name: "right-edge", x: [0.88, 1], y: [0.32, 0.68] },
];

const mobileRegions: RoamRegion[] = [
  { name: "right-center", x: [0.54, 0.78], y: [0.08, 0.48] },
  { name: "right-bottom", x: [0.7, 1], y: [0.48, 1] },
  { name: "bottom-center", x: [0.48, 0.78], y: [0.7, 1] },
];

const safetySelectors = [
  {
    selector: ".welcome-nav .brand-lockup",
    label: "Moolo header",
    padding: 24,
  },
  {
    selector: ".builders-pill",
    label: "Rialo Builders Hub badge",
    padding: 24,
  },
  {
    selector: ".welcome-nav-actions",
    label: "Landing header actions",
    padding: 24,
  },
  {
    selector: ".welcome-copy > .eyebrow",
    label: "Hero eyebrow",
    padding: 24,
  },
  {
    selector: ".welcome-copy h1",
    label: "Hero headline",
    padding: 32,
  },
  {
    selector: ".welcome-lead",
    label: "Supporting paragraph",
    padding: 32,
  },
  {
    selector: ".welcome-cta",
    label: "Enter Demo Wallet CTA",
    padding: 36,
  },
  {
    selector: ".welcome-notice-slot",
    label: "Simulation mode information",
    padding: 24,
  },
  {
    selector: ".welcome-proof",
    label: "Technology bullets",
    padding: 14,
  },
  {
    selector: ".stage-note-top",
    label: "Wallet protected chip",
    padding: 22,
  },
  {
    selector: ".stage-note-bottom",
    label: "0 threats chip",
    padding: 22,
  },
  {
    selector: ".floating-check",
    label: "Floating protection mark",
    padding: 22,
  },
  {
    selector: ".floating-lock",
    label: "Floating lock",
    padding: 22,
  },
  {
    selector: ".welcome-rialo",
    label: "Rialo information card",
    padding: 24,
  },
] as const;

const randomBetween = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum);

const randomInteger = (minimum: number, maximum: number) =>
  Math.floor(randomBetween(minimum, maximum + 1));

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function shuffle<T>(items: readonly T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getRoamProfile(viewportWidth: number): RoamProfile {
  if (viewportWidth <= 320) {
    return {
      name: "compact",
      enabled: false,
      waypointMin: 0,
      waypointMax: 0,
      normalSpeed: [0, 0],
      dashSpeed: [0, 0],
      maxDashCount: 0,
      restDelay: [0, 0],
      firstDelay: [0, 0],
      roamDuration: [0, 0],
      minSegmentDistance: 0,
      preferredSegmentDistance: [0, 0],
    };
  }

  if (viewportWidth <= 390) {
    return {
      name: "mobile",
      enabled: true,
      waypointMin: 2,
      waypointMax: 3,
      normalSpeed: [160, 210],
      dashSpeed: [220, 260],
      maxDashCount: 0,
      restDelay: [10_000, 14_000],
      firstDelay: [3_500, 5_000],
      roamDuration: [2.5, 3.5],
      minSegmentDistance: 70,
      preferredSegmentDistance: [90, 210],
    };
  }

  if (viewportWidth <= 768) {
    return {
      name: "tablet",
      enabled: true,
      waypointMin: 3,
      waypointMax: 5,
      normalSpeed: [180, 260],
      dashSpeed: [300, 360],
      maxDashCount: 1,
      restDelay: [8_000, 14_000],
      firstDelay: [3_000, 5_000],
      roamDuration: [5.5, 9],
      minSegmentDistance: 100,
      preferredSegmentDistance: [160, 360],
    };
  }

  return {
    name: "desktop",
    enabled: true,
    waypointMin: 5,
    waypointMax: 9,
    normalSpeed: [260, 360],
    dashSpeed: [420, 520],
    maxDashCount: 2,
    restDelay: [5_000, 9_000],
    firstDelay: [2_500, 4_500],
    roamDuration: [7, 12],
    minSegmentDistance: 180,
    preferredSegmentDistance: [280, 620],
  };
}

function rectanglesOverlap(
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

function getDepthScale(point: RoamPoint, geometry: Geometry) {
  const availableHeight = Math.max(
    1,
    geometry.bounds.maxY - geometry.bounds.minY,
  );
  const verticalProgress = clamp(
    (point.y - geometry.bounds.minY) / availableHeight,
    0,
    1,
  );
  return clamp(0.93 + verticalProgress * 0.12, 0.93, 1.05);
}

function getMascotRect(point: RoamPoint, geometry: Geometry) {
  const scale = getDepthScale(point, geometry);
  const width = geometry.collisionWidth * scale;
  const height = geometry.collisionHeight * scale;
  const left =
    geometry.stageRect.left +
    point.x -
    (width - geometry.mascotWidth) / 2;
  const top =
    geometry.stageRect.top +
    point.y -
    (height - geometry.mascotHeight) / 2;

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
  };
}

function isPointSafe(point: RoamPoint, geometry: Geometry) {
  const { bounds } = geometry;
  if (
    point.x < bounds.minX ||
    point.x > bounds.maxX ||
    point.y < bounds.minY ||
    point.y > bounds.maxY
  ) {
    return false;
  }

  const mascotRect = getMascotRect(point, geometry);
  return geometry.forbiddenZones.every(
    (zone) => !rectanglesOverlap(mascotRect, zone),
  );
}

function isSegmentSafe(
  from: RoamPoint,
  to: RoamPoint,
  geometry: Geometry,
) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(8, Math.ceil(distance / 48));
  for (let sample = 1; sample <= samples; sample += 1) {
    const progress = sample / samples;
    if (
      !isPointSafe(
        {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        },
        geometry,
      )
    ) {
      return false;
    }
  }
  return true;
}

function pointFromRatios(
  xRatio: number,
  yRatio: number,
  geometry: Geometry,
): RoamPoint {
  const { bounds } = geometry;
  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) * xRatio,
    y: bounds.minY + (bounds.maxY - bounds.minY) * yRatio,
  };
}

function randomSafePoint(geometry: Geometry) {
  const { bounds } = geometry;
  for (let attempt = 0; attempt < MAX_WAYPOINT_ATTEMPTS; attempt += 1) {
    const point = {
      x: randomBetween(bounds.minX, bounds.maxX),
      y: randomBetween(bounds.minY, bounds.maxY),
    };
    if (isPointSafe(point, geometry)) return point;
  }
  return null;
}

function findSafeRoute(
  from: RoamPoint,
  target: RoamPoint,
  geometry: Geometry,
) {
  if (isSegmentSafe(from, target, geometry)) return [target];

  const bottomFrom = { x: from.x, y: geometry.bounds.maxY };
  const bottomTarget = { x: target.x, y: geometry.bounds.maxY };
  const bottomRoute = [bottomFrom, bottomTarget, target].filter(
    (point, index, points) =>
      index === 0 ||
      point.x !== points[index - 1].x ||
      point.y !== points[index - 1].y,
  );
  let bottomCurrent = from;
  let bottomRouteIsSafe = true;
  for (const point of bottomRoute) {
    if (
      !isPointSafe(point, geometry) ||
      !isSegmentSafe(bottomCurrent, point, geometry)
    ) {
      bottomRouteIsSafe = false;
      break;
    }
    bottomCurrent = point;
  }
  if (bottomRouteIsSafe) return bottomRoute;

  for (let attempt = 0; attempt < MAX_WAYPOINT_ATTEMPTS; attempt += 1) {
    const controlPoint = randomSafePoint(geometry);
    if (
      controlPoint &&
      isSegmentSafe(from, controlPoint, geometry) &&
      isSegmentSafe(controlPoint, target, geometry)
    ) {
      return [controlPoint, target];
    }
  }

  return [];
}

function findSafeTarget(
  from: RoamPoint,
  region: RoamRegion,
  geometry: Geometry,
  profile: RoamProfile,
) {
  for (let attempt = 0; attempt < MAX_WAYPOINT_ATTEMPTS; attempt += 1) {
    const candidate = pointFromRatios(
      randomBetween(region.x[0], region.x[1]),
      randomBetween(region.y[0], region.y[1]),
      geometry,
    );
    const distance = Math.hypot(
      candidate.x - from.x,
      candidate.y - from.y,
    );
    const enforcePreferredDistance = attempt < 14;

    if (
      distance < profile.minSegmentDistance ||
      (enforcePreferredDistance &&
        distance < profile.preferredSegmentDistance[0]) ||
      !isPointSafe(candidate, geometry)
    ) {
      continue;
    }

    const route = findSafeRoute(from, candidate, geometry);
    if (route.length > 0) return route;
  }
  return [];
}

function findNearestSafeRestAnchor(
  current: RoamPoint,
  geometry: Geometry,
) {
  const candidates = restAnchors
    .map((anchor) =>
      pointFromRatios(anchor.xRatio, anchor.yRatio, geometry),
    )
    .filter((point) => isPointSafe(point, geometry))
    .sort(
      (first, second) =>
        Math.hypot(first.x - current.x, first.y - current.y) -
        Math.hypot(second.x - current.x, second.y - current.y),
    );

  for (const candidate of candidates) {
    const route = findSafeRoute(current, candidate, geometry);
    if (route.length > 0) return route;
  }

  if (isPointSafe(current, geometry)) return [current];
  const fallback = randomSafePoint(geometry);
  return fallback ? [fallback] : [];
}

function isEdgePoint(point: RoamPoint, geometry: Geometry) {
  const { bounds } = geometry;
  const edgeX = (bounds.maxX - bounds.minX) * 0.1;
  const edgeY = (bounds.maxY - bounds.minY) * 0.1;
  return (
    point.x <= bounds.minX + edgeX ||
    point.x >= bounds.maxX - edgeX ||
    point.y <= bounds.minY + edgeY ||
    point.y >= bounds.maxY - edgeY
  );
}

function pickIndexes(maximum: number, count: number, excluded: Set<number>) {
  const available = shuffle(
    Array.from({ length: maximum }, (_, index) => index).filter(
      (index) => !excluded.has(index),
    ),
  );
  return new Set(available.slice(0, count));
}

function createRoamPlan(
  profile: RoamProfile,
  geometry: Geometry,
  start: RoamPoint,
  mode: RoamMode,
) {
  const totalWaypointTarget =
    mode === "click"
      ? 3
      : randomInteger(profile.waypointMin, profile.waypointMax);
  const regions =
    profile.name === "mobile" ? mobileRegions : desktopRegions;
  const currentRatio =
    (start.x - geometry.bounds.minX) /
    Math.max(1, geometry.bounds.maxX - geometry.bounds.minX);
  const oppositeRegions =
    currentRatio >= 0.5
      ? regions.filter((region) => region.x[1] <= 0.5)
      : regions.filter((region) => region.x[0] >= 0.5);
  const crossingRegion =
    currentRatio >= 0.5
      ? regions.find((region) => region.name === "left-crossing")
      : regions.find((region) => region.name === "right-crossing");
  const firstRegion =
    crossingRegion ??
    oppositeRegions[randomInteger(0, Math.max(0, oppositeRegions.length - 1))] ??
    regions[0];
  const regionSequence = [
    firstRegion,
    ...shuffle(regions.filter((region) => region !== firstRegion)),
    ...shuffle(regions),
  ];
  const route: RoamPoint[] = [];
  let current = start;
  const movementWaypointTarget = Math.max(1, totalWaypointTarget - 1);

  for (
    let index = 0;
    index < regionSequence.length && route.length < movementWaypointTarget;
    index += 1
  ) {
    const nextRoute = findSafeTarget(
      current,
      regionSequence[index],
      geometry,
      profile,
    );
    if (nextRoute.length === 0) continue;

    const remaining = movementWaypointTarget - route.length;
    if (nextRoute.length > remaining) continue;
    route.push(...nextRoute);
    current = nextRoute[nextRoute.length - 1];
  }

  for (
    let attempt = 0;
    attempt < MAX_WAYPOINT_ATTEMPTS &&
    route.length < movementWaypointTarget;
    attempt += 1
  ) {
    const fallback = randomSafePoint(geometry);
    if (!fallback) break;
    const fallbackRoute = findSafeRoute(current, fallback, geometry);
    if (fallbackRoute.length === 0) continue;
    const remaining = movementWaypointTarget - route.length;
    if (fallbackRoute.length > remaining) continue;
    route.push(...fallbackRoute);
    current = fallbackRoute[fallbackRoute.length - 1];
  }

  let restRoute = findNearestSafeRestAnchor(current, geometry);
  while (route.length + restRoute.length > 9 && route.length > 0) {
    route.pop();
    current = route[route.length - 1] ?? start;
    restRoute = findNearestSafeRestAnchor(current, geometry);
  }
  route.push(...restRoute);

  const finalIndex = Math.max(0, route.length - 1);
  const dashCount =
    mode === "click"
      ? Math.min(1, finalIndex)
      : profile.maxDashCount === 0
        ? 0
        : randomInteger(1, profile.maxDashCount);
  const dashIndexes = pickIndexes(finalIndex, dashCount, new Set());
  const pauseCount =
    mode === "ambient" && profile.name !== "mobile"
      ? Math.min(randomInteger(1, 2), Math.max(0, finalIndex - dashCount))
      : 0;
  const pauseIndexes = pickIndexes(finalIndex, pauseCount, dashIndexes);
  const playfulIndexes =
    mode === "ambient" && profile.name === "desktop"
      ? pickIndexes(finalIndex, 1, new Set([...dashIndexes, ...pauseIndexes]))
      : new Set<number>();

  return route.map<PlannedPoint>((point, index) => ({
    ...point,
    dash: dashIndexes.has(index),
    edgeTurn: index < finalIndex && isEdgePoint(point, geometry),
    pause: pauseIndexes.has(index),
    playfulHop: playfulIndexes.has(index),
  }));
}

function getSegmentDurations(
  points: PlannedPoint[],
  start: RoamPoint,
  profile: RoamProfile,
  mode: RoamMode,
) {
  let current = start;
  const rawDurations = points.map((point) => {
    const distance = Math.hypot(point.x - current.x, point.y - current.y);
    const speedRange = point.dash
      ? profile.dashSpeed
      : profile.normalSpeed;
    const speed = randomBetween(speedRange[0], speedRange[1]);
    current = point;
    return clamp(distance / Math.max(1, speed), 0.65, 2.2);
  });
  const rawTotal = rawDurations.reduce((total, duration) => total + duration, 0);
  const targetRange =
    mode === "click" ? ([2.8, 4.2] as const) : profile.roamDuration;
  const targetTotal = randomBetween(targetRange[0], targetRange[1]);
  const scale = rawTotal > 0 ? targetTotal / rawTotal : 1;

  return rawDurations.map((duration) =>
    clamp(duration * scale, 0.65, 2.2),
  );
}

export function LandingMooloRoamer({
  state = "idle",
  exiting = false,
}: LandingMooloRoamerProps) {
  const { t } = useTranslation();
  const reduceMotion = Boolean(useReducedMotion());
  const positionControls = useAnimationControls();
  const directionControls = useAnimationControls();
  const bodyControls = useAnimationControls();
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLButtonElement>(null);
  const currentPointRef = useRef<RoamPoint>({ x: 0, y: 0 });
  const clickRoamRef = useRef<() => void>(() => undefined);
  const [phase, setPhase] = useState<RoamPhase>("idle");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [blinking, setBlinking] = useState(false);
  const [profileName, setProfileName] =
    useState<RoamProfileName>("desktop");
  const [roamingEnabled, setRoamingEnabled] = useState(false);
  const [geometryReady, setGeometryReady] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    const body = bodyRef.current;
    const landingRoot = stage?.closest<HTMLElement>(".welcome-screen");
    if (!stage || !body || !landingRoot) return;

    let active = true;
    let sequenceId = 0;
    let roaming = false;
    let directionValue: 1 | -1 = 1;
    let clickCooldownUntil = 0;
    let profile = getRoamProfile(stage.getBoundingClientRect().width);
    let roamTimeout: number | null = null;
    let blinkTimeout: number | null = null;
    let pauseTimeout: number | null = null;
    let resolvePause: ((completed: boolean) => void) | null = null;

    const clearRoamTimeout = () => {
      if (roamTimeout !== null) {
        window.clearTimeout(roamTimeout);
        roamTimeout = null;
      }
    };

    const clearBlinkTimeout = () => {
      if (blinkTimeout !== null) {
        window.clearTimeout(blinkTimeout);
        blinkTimeout = null;
      }
    };

    const clearPauseTimeout = () => {
      if (pauseTimeout !== null) {
        window.clearTimeout(pauseTimeout);
        pauseTimeout = null;
      }
      if (resolvePause) {
        const resolve = resolvePause;
        resolvePause = null;
        resolve(false);
      }
    };

    const clearAllTimeouts = () => {
      clearRoamTimeout();
      clearBlinkTimeout();
      clearPauseTimeout();
    };

    const canRoam = () =>
      active &&
      !exiting &&
      roamingStates.has(state) &&
      !reduceMotion &&
      profile.enabled &&
      document.visibilityState === "visible";

    const updateProfile = () => {
      profile = getRoamProfile(stage.getBoundingClientRect().width);
      if (!active) return;
      setProfileName(profile.name);
      setRoamingEnabled(
        !exiting &&
          profile.enabled &&
          roamingStates.has(state) &&
          !reduceMotion,
      );
    };

    const readGeometry = (): Geometry => {
      const stageRect = stage.getBoundingClientRect();
      const mascotWidth = body.offsetWidth;
      const mascotHeight = body.offsetHeight;
      let minX = EDGE_PADDING;
      const maxX = Math.max(
        minX,
        stageRect.width - mascotWidth - EDGE_PADDING,
      );
      let minY = HEADER_SAFE_AREA;
      const maxY = Math.max(
        minY,
        stageRect.height - mascotHeight - BOTTOM_SAFE_AREA,
      );

      if (profile.name === "mobile") {
        minX = Math.max(minX, stageRect.width * 0.5);
        minY = Math.max(minY, stageRect.height * 0.56);
      }

      const forbiddenZones = safetySelectors.flatMap(
        ({ selector, label, padding }) =>
          Array.from(landingRoot.querySelectorAll<HTMLElement>(selector))
            .filter((element) => {
              const styles = window.getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                styles.display !== "none" &&
                styles.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0
              );
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                label,
                left: rect.left - padding,
                right: rect.right + padding,
                top: rect.top - padding,
                bottom: rect.bottom + padding,
              };
            }),
      );

      return {
        stageRect,
        mascotWidth,
        mascotHeight,
        collisionWidth: mascotWidth,
        collisionHeight: mascotHeight,
        bounds: { minX, maxX, minY, maxY },
        forbiddenZones,
      };
    };

    const setDirectionValue = (nextDirection: 1 | -1) => {
      if (directionValue === nextDirection) return;
      directionValue = nextDirection;
      if (active) setDirection(nextDirection);
    };

    const setPositionImmediately = (
      point: RoamPoint,
      geometry: Geometry,
    ) => {
      currentPointRef.current = point;
      positionControls.set({
        x: point.x,
        y: point.y,
        scale: getDepthScale(point, geometry),
      });
    };

    const startIdle = () => {
      bodyControls.stop();
      if (
        reduceMotion ||
        state === "scanning" ||
        state === "alert" ||
        state === "guard" ||
        state === "waiting" ||
        state === "frozen"
      ) {
        bodyControls.set({
          opacity: 1,
          y: 0,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          rotate: 0,
        });
        return;
      }

      void bodyControls.start({
        opacity: 1,
        y: [0, -3, 0],
        scale: [1, 1.01, 1],
        rotate: [0, 0.25, 0],
        transition: {
          duration: 3.4,
          ease: smoothEase,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
        },
      });
    };

    const scheduleBlink = (delay = randomBetween(3_500, 6_500)) => {
      clearBlinkTimeout();
      if (!active || document.visibilityState !== "visible") return;
      blinkTimeout = window.setTimeout(() => {
        blinkTimeout = null;
        if (!active) return;
        if (roaming) {
          scheduleBlink(randomBetween(4_800, 7_200));
          return;
        }
        setBlinking(true);
        blinkTimeout = window.setTimeout(() => {
          blinkTimeout = null;
          if (!active) return;
          setBlinking(false);
          scheduleBlink();
        }, 210);
      }, delay);
    };

    const waitFor = (duration: number, currentSequence: number) =>
      new Promise<boolean>((resolve) => {
        clearPauseTimeout();
        resolvePause = resolve;
        pauseTimeout = window.setTimeout(() => {
          pauseTimeout = null;
          resolvePause = null;
          resolve(
            active &&
              currentSequence === sequenceId &&
              document.visibilityState === "visible",
          );
        }, duration);
      });

    const moveToNearestRest = async (
      geometry: Geometry,
      duration: number,
    ) => {
      const route = findNearestSafeRestAnchor(
        currentPointRef.current,
        geometry,
      );
      const target = route[route.length - 1];
      if (!target) return;
      currentPointRef.current = target;
      await positionControls.start({
        x: target.x,
        y: target.y,
        scale: getDepthScale(target, geometry),
        transition: { duration, ease: settleEase },
      });
    };

    const cancelSequence = () => {
      sequenceId += 1;
      roaming = false;
      clearAllTimeouts();
      positionControls.stop();
      directionControls.stop();
      bodyControls.stop();
      setBlinking(false);
    };

    const scheduleRoam = (delay: number) => {
      clearRoamTimeout();
      if (!canRoam()) return;
      roamTimeout = window.setTimeout(() => {
        roamTimeout = null;
        void runRoam("ambient");
      }, delay);
    };

    const runPause = async (currentSequence: number) => {
      setPhase("pausing");
      bodyControls.stop();
      setBlinking(true);
      void bodyControls.start({
        y: [0, -2, 0],
        rotate: [0, -2.5, 2.5, 0],
        transition: { duration: 0.55, ease: "easeInOut" },
      });
      if (!(await waitFor(210, currentSequence))) return false;
      setBlinking(false);
      return waitFor(randomBetween(290, 990), currentSequence);
    };

    const runRoam = async (mode: RoamMode) => {
      if (!canRoam() || roaming) return;
      const geometry = readGeometry();
      const plan = createRoamPlan(
        profile,
        geometry,
        currentPointRef.current,
        mode,
      );
      if (plan.length === 0) {
        scheduleRoam(randomBetween(profile.restDelay[0], profile.restDelay[1]));
        return;
      }

      const currentSequence = ++sequenceId;
      roaming = true;
      clearAllTimeouts();
      setBlinking(false);

      if (mode === "ambient") {
        setPhase("looking");
        await bodyControls.start({
          rotate: [0, -3, 3, 0],
          y: [0, -2, 0],
          transition: { duration: 0.55, ease: "easeInOut" },
        });
      }

      if (!active || currentSequence !== sequenceId) return;
      setPhase("starting");
      await bodyControls.start({
        y: [0, -14, 0],
        scaleX: [1, 1.04, 1],
        scaleY: [1, 0.96, 1],
        rotate: [0, -2, 0],
        transition: { duration: 0.4, ease: settleEase },
      });

      if (
        !active ||
        currentSequence !== sequenceId ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      const durations = getSegmentDurations(
        plan,
        currentPointRef.current,
        profile,
        mode,
      );
      setPhase("roaming");

      for (let index = 0; index < plan.length; index += 1) {
        const point = plan[index];
        if (
          !active ||
          currentSequence !== sequenceId ||
          document.visibilityState !== "visible"
        ) {
          return;
        }

        const currentPoint = currentPointRef.current;
        const nextDirection: 1 | -1 =
          point.x >= currentPoint.x ? 1 : -1;
        const directionChanged = nextDirection !== directionValue;
        setDirectionValue(nextDirection);

        if (directionChanged) {
          await directionControls.start({
            scaleX: nextDirection,
            y: [0, -4, 0],
            rotate: [0, nextDirection * 2, 0],
            transition: { duration: 0.18, ease: settleEase },
          });
        } else {
          directionControls.set({ scaleX: nextDirection, y: 0, rotate: 0 });
        }

        if (!active || currentSequence !== sequenceId) return;
        setPhase("roaming");
        void bodyControls.start({
          y: point.dash ? [0, -9, 0] : [0, -7, 0],
          rotate: point.dash ? [-3, 3, -3] : [-2, 2, -2],
          scaleX: point.dash ? [1, 1.025, 1] : [1, 1.012, 1],
          scaleY: point.dash ? [1, 0.95, 1] : [1, 0.965, 1],
          transition: {
            duration: point.dash ? 0.22 : 0.27,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
          },
        });

        await positionControls.start({
          x: point.x,
          y: point.y,
          scale: getDepthScale(point, geometry),
          transition: {
            duration: durations[index],
            ease: smoothEase,
          },
        });
        currentPointRef.current = point;

        if (!active || currentSequence !== sequenceId) return;
        if (point.edgeTurn) {
          setPhase("turning");
          bodyControls.stop();
          await bodyControls.start({
            y: [0, -8, 0],
            rotate: [0, 4, -2, 0],
            scaleY: [1, 0.96, 1],
            transition: { duration: 0.34, ease: settleEase },
          });
        }

        if (point.playfulHop) {
          bodyControls.stop();
          await bodyControls.start({
            y: [0, -20, 0],
            rotate: [0, -4, 4, 0],
            scale: [1, 1.035, 1],
            transition: { duration: 0.48, ease: settleEase },
          });
        }

        if (point.pause && !(await runPause(currentSequence))) return;
      }

      if (!active || currentSequence !== sequenceId) return;
      bodyControls.stop();
      setPhase("landing");
      await bodyControls.start({
        y: [-6, 0],
        scaleX: [1, 1.045, 1],
        scaleY: [1, 0.955, 1],
        rotate: [1.5, 0],
        transition: { duration: 0.26, ease: "easeOut" },
      });

      if (!active || currentSequence !== sequenceId) return;
      roaming = false;
      setPhase("idle");
      startIdle();
      scheduleBlink(randomBetween(1_800, 3_200));
      scheduleRoam(
        randomBetween(profile.restDelay[0], profile.restDelay[1]),
      );
    };

    clickRoamRef.current = () => {
      if (
        !active ||
        roaming ||
        !roamingStates.has(state) ||
        Date.now() < clickCooldownUntil
      ) {
        return;
      }
      clickCooldownUntil = Date.now() + 1_500;
      clearRoamTimeout();

      if (reduceMotion || !profile.enabled) {
        const currentSequence = ++sequenceId;
        void bodyControls
          .start({
            opacity: reduceMotion ? [1, 0.88, 1] : 1,
            y: reduceMotion ? 0 : [0, -10, 0],
            transition: { duration: reduceMotion ? 0.16 : 0.34 },
          })
          .then(() => {
            if (!active || currentSequence !== sequenceId) return;
            startIdle();
          });
        return;
      }

      void runRoam("click");
    };

    const placeAtSafeAnchor = () => {
      const geometry = readGeometry();
      const route = findNearestSafeRestAnchor(
        currentPointRef.current,
        geometry,
      );
      const target =
        route[route.length - 1] ??
        randomSafePoint(geometry) ??
        {
          x: geometry.bounds.maxX,
          y: geometry.bounds.minY,
        };
      setPositionImmediately(target, geometry);
      setGeometryReady(true);
    };

    const handleVisibilityChange = () => {
      if (!active) return;
      const visible = document.visibilityState === "visible";
      setPageVisible(visible);
      cancelSequence();
      placeAtSafeAnchor();
      setPhase("idle");

      if (visible && !exiting) {
        startIdle();
        scheduleBlink(randomBetween(3_500, 6_500));
        scheduleRoam(randomBetween(3_000, 5_000));
      }
    };

    let observedOnce = false;
    const resizeObserver = new ResizeObserver(() => {
      updateProfile();
      if (!observedOnce) {
        observedOnce = true;
        if (!exiting) placeAtSafeAnchor();
        return;
      }

      if (exiting) return;
      cancelSequence();
      placeAtSafeAnchor();
      setPhase("idle");
      startIdle();
      scheduleBlink();
      scheduleRoam(randomBetween(3_000, 5_000));
    });

    resizeObserver.observe(stage);
    resizeObserver.observe(body);
    safetySelectors.forEach(({ selector }) => {
      landingRoot
        .querySelectorAll<HTMLElement>(selector)
        .forEach((element) => resizeObserver.observe(element));
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateProfile();
    setPageVisible(document.visibilityState === "visible");
    directionControls.set({ scaleX: 1, y: 0, rotate: 0 });

    if (exiting) {
      cancelSequence();
      const geometry = readGeometry();
      void moveToNearestRest(geometry, reduceMotion ? 0 : 0.18);
    } else {
      placeAtSafeAnchor();
      startIdle();
      scheduleBlink();
      scheduleRoam(randomBetween(profile.firstDelay[0], profile.firstDelay[1]));
    }

    return () => {
      active = false;
      sequenceId += 1;
      clearAllTimeouts();
      resizeObserver.disconnect();
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      positionControls.stop();
      directionControls.stop();
      bodyControls.stop();
      clickRoamRef.current = () => undefined;
    };
  }, [
    bodyControls,
    directionControls,
    exiting,
    positionControls,
    reduceMotion,
    state,
  ]);

  return (
    <motion.div
      className="moolo-roam-reveal"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: reduceMotion ? 0 : 0.96,
        duration: reduceMotion ? 0.15 : 0.5,
      }}
    >
      <div
        ref={stageRef}
        className="moolo-roam-stage"
        data-geometry-ready={geometryReady}
        data-page-visible={pageVisible}
        data-reduced-motion={reduceMotion}
        data-roam-enabled={roamingEnabled}
        data-roam-phase={exiting ? "exiting" : phase}
        data-roam-profile={profileName}
      >
        <motion.div
          className="moolo-position-layer"
          animate={positionControls}
        >
          <motion.div
            className="moolo-direction-layer"
            animate={directionControls}
            data-direction={direction}
          >
            <motion.button
              ref={bodyRef}
              className={`moolo-body-layer ${phase === "roaming" ? "is-roaming" : ""}`}
              type="button"
              animate={bodyControls}
              onClick={() => clickRoamRef.current()}
              aria-label={t("Run with Moolo")}
            >
              <MooloMascot
                state={state}
                size="large"
                blinking={blinking}
              />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
