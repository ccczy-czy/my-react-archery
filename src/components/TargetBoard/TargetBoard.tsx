import React, { useRef, useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import useScreenSize from "../../hooks/useScreenSize";
import {
  initialRingRadius,
  ringGap,
  ringColors,
  boardSize,
  dotRadius,
  LONG_PRESS_DURATION,
} from "../../constant";

import styles from "./TargetBoard.module.css";

/* 
  Properties of screen-shape transform
*/
type TransformProps = {
  /* 
    transform in x direction
  */
  x: number;
  /* 
    transform in y direction
  */
  y: number;
  /* 
    transform in scale
  */
  scale: number;
};

/* 
  Properties of dot
*/
type Dot = {
  /* 
    ID of dot
  */
  id: string;
  /* 
    x coordinate of dot
  */
  x: number;
  /* 
    y coordinate of dot
  */
  y: number;
  /* 
    Determine if dot is temporary
  */
  isTemporary: boolean;
  /* 
    Determine if dot is dragging
  */
  isDragging: boolean;
};

/* 
  Properties of ring
*/
type RingInfo = {
  /* 
    Outer radius of ring
  */
  outerRadius: number;
  /* 
    Inner radius of ring
  */
  innerRadius: number;
  /* 
    Fill color of ring
  */
  color: string;
  /* 
    Index of ring
  */
  index: number;
};

export default function TargetBoard() {
  const screenSize = useScreenSize();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<TransformProps>({
    x: screenSize.width / 2,
    y: screenSize.height / 2,
    scale: 1,
  });
  const [dots, setDots] = useState<Dot[]>([]);
  const [temporaryDot, setTemporaryDot] = useState<Dot | null>(null);
  const [enclosingCircle, setEnclosingCircle] = useState<{
    x: number;
    y: number;
    radius: number;
  } | null>(null);
  const [highlightedRing, setHighlightedRing] = useState<number | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null
  );
  const [lastTouchCenter, setLastTouchCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [draggedDotId, setDraggedDotId] = useState<string | null>(null);
  const [mouseDownInfo, setMouseDownInfo] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    time: number;
    longPress: boolean;
  } | null>(null);
  const [touchStartInfo, setTouchStartInfo] = useState<{
    x: number;
    y: number;
    time: number;
    longPress: boolean;
  } | null>(null);
  const [wasPinch, setWasPinch] = useState(false);

  const getRings = useCallback((): RingInfo[] => {
    return ringColors.map((color, i) => {
      const outerRadius = initialRingRadius - i * ringGap;
      const innerRadius = outerRadius - ringGap;
      return {
        outerRadius,
        innerRadius,
        color,
        index: i,
      };
    });
  }, []);

  const screenToTarget = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - transform.x) / transform.scale,
        y: (screenY - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  const targetToScreen = useCallback(
    (targetX: number, targetY: number) => {
      return {
        x: targetX * transform.scale + transform.x,
        y: targetY * transform.scale + transform.y,
      };
    },
    [transform]
  );

  const getRingAtPoint = useCallback(
    (x: number, y: number): number | null => {
      const rings = getRings();
      const distance = Math.sqrt(x * x + y * y);
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        if (distance <= ring.outerRadius && distance > ring.innerRadius) {
          return i;
        }
      }
      return null;
    },
    [getRings]
  );

  const getDistance = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    []
  );

  const getCenter = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      };
    },
    []
  );

  const calculateEnclosingCircle = useCallback((allDots: Dot[]) => {
    if (allDots.length === 0) return null;
    const targetDots = allDots.map((dot) => ({ x: dot.x, y: dot.y }));
    const centerX =
      targetDots.reduce((sum, dot) => sum + dot.x, 0) / targetDots.length;
    const centerY =
      targetDots.reduce((sum, dot) => sum + dot.y, 0) / targetDots.length;
    const maxDistance = Math.max(
      ...targetDots.map((dot) =>
        Math.sqrt((dot.x - centerX) ** 2 + (dot.y - centerY) ** 2)
      )
    );
    return {
      x: centerX,
      y: centerY,
      radius: maxDistance,
    };
  }, []);

  useEffect(() => {
    const allDots = temporaryDot ? [...dots, temporaryDot] : dots;
    const circle = calculateEnclosingCircle(allDots);
    setEnclosingCircle(circle);
  }, [dots, temporaryDot, calculateEnclosingCircle]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2 / transform.scale;
    ctx.fillRect(-boardSize / 2, -boardSize / 2, boardSize, boardSize);
    ctx.strokeRect(-boardSize / 2, -boardSize / 2, boardSize, boardSize);
    const rings = getRings();
    rings.forEach((ring, i) => {
      ctx.fillStyle = ring.color;
      ctx.strokeStyle = ring.color === "#000" && i % 2 ? "#fff" : "#000";
      ctx.lineWidth =
        highlightedRing === i ? 4 / transform.scale : 1 / transform.scale;
      if (highlightedRing === i) ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, ring.outerRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ring.innerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    if (enclosingCircle) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 3 / transform.scale;
      ctx.setLineDash([10 / transform.scale, 5 / transform.scale]);
      ctx.beginPath();
      ctx.arc(
        enclosingCircle.x,
        enclosingCircle.y,
        enclosingCircle.radius,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    [...dots, ...(temporaryDot ? [temporaryDot] : [])].forEach((dot) => {
      const { x, y } = targetToScreen(dot.x, dot.y);
      ctx.fillStyle = dot.isTemporary
        ? dot.isDragging
          ? "#00cc44"
          : "#ff0000"
        : "#ff0000";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }, [
    transform,
    dots,
    temporaryDot,
    enclosingCircle,
    highlightedRing,
    getRings,
    targetToScreen,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setTouchStartInfo({
          x,
          y,
          time: Date.now(),
          longPress: false,
        });
        setWasPinch(false);
        const timer = window.setTimeout(() => {
          const { x: tx, y: ty } = screenToTarget(x, y);
          const newTemporaryDot: Dot = {
            id: uuidv4(),
            x: tx,
            y: ty,
            isTemporary: true,
            isDragging: true,
          };
          setTemporaryDot(newTemporaryDot);
          setDraggedDotId(newTemporaryDot.id);
          setTouchStartInfo((info) =>
            info ? { ...info, longPress: true } : null
          );
        }, LONG_PRESS_DURATION);
        setLongPressTimer(timer);
      } else if (event.touches.length === 2) {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x1 = touch1.clientX - rect.left;
        const y1 = touch1.clientY - rect.top;
        const x2 = touch2.clientX - rect.left;
        const y2 = touch2.clientY - rect.top;
        const distance = getDistance(x1, y1, x2, y2);
        const center = getCenter(x1, y1, x2, y2);
        setLastTouchDistance(distance);
        setLastTouchCenter(center);
        setWasPinch(true);
      }
    },
    [longPressTimer, getDistance, getCenter, screenToTarget]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 1 && temporaryDot && draggedDotId) {
        const touch = event.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const { x: tx, y: ty } = screenToTarget(x, y);
        setTemporaryDot((prev) => (prev ? { ...prev, x: tx, y: ty } : null));
        const ringIndex = getRingAtPoint(tx, ty);
        setHighlightedRing(ringIndex);
      } else if (
        event.touches.length === 2 &&
        lastTouchDistance &&
        lastTouchCenter
      ) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x1 = touch1.clientX - rect.left;
        const y1 = touch1.clientY - rect.top;
        const x2 = touch2.clientX - rect.left;
        const y2 = touch2.clientY - rect.top;
        const distance = getDistance(x1, y1, x2, y2);
        const center = getCenter(x1, y1, x2, y2);
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.max(
          0.1,
          Math.min(5, transform.scale * scaleChange)
        );
        const deltaX = center.x - lastTouchCenter.x;
        const deltaY = center.y - lastTouchCenter.y;
        setTransform((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
          scale: newScale,
        }));
        setLastTouchDistance(distance);
        setLastTouchCenter(center);
      }
    },
    [
      temporaryDot,
      draggedDotId,
      lastTouchDistance,
      lastTouchCenter,
      screenToTarget,
      getRingAtPoint,
      getDistance,
      getCenter,
      transform.scale,
    ]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (longPressTimer) {
        window.clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      if (event.touches.length === 0) {
        if (draggedDotId && temporaryDot) {
          setDots((prev) => [
            ...prev,
            { ...temporaryDot, isTemporary: false, isDragging: false },
          ]);
          setTemporaryDot(null);
          setDraggedDotId(null);
          setHighlightedRing(null);
        } else if (touchStartInfo && !touchStartInfo.longPress && !wasPinch) {
          const { x, y } = screenToTarget(touchStartInfo.x, touchStartInfo.y);
          setDots((prev) => [
            ...prev,
            {
              id: uuidv4(),
              x,
              y,
              isTemporary: false,
              isDragging: false,
            },
          ]);
        }
        setLastTouchDistance(null);
        setLastTouchCenter(null);
        setTouchStartInfo(null);
        setWasPinch(false);
      }
    },
    [
      longPressTimer,
      draggedDotId,
      temporaryDot,
      touchStartInfo,
      screenToTarget,
      wasPinch,
    ]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMouseDownInfo({
        x,
        y,
        screenX: event.clientX,
        screenY: event.clientY,
        time: Date.now(),
        longPress: false,
      });
      const timer = window.setTimeout(() => {
        const { x: tx, y: ty } = screenToTarget(x, y);
        const newTemporaryDot: Dot = {
          id: uuidv4(),
          x: tx,
          y: ty,
          isTemporary: true,
          isDragging: true,
        };
        setTemporaryDot(newTemporaryDot);
        setDraggedDotId(newTemporaryDot.id);
        setMouseDownInfo((info) =>
          info ? { ...info, longPress: true } : null
        );
      }, LONG_PRESS_DURATION);
      setLongPressTimer(timer);
    },
    [screenToTarget]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (temporaryDot && draggedDotId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const { x: tx, y: ty } = screenToTarget(x, y);
        setTemporaryDot((prev) => (prev ? { ...prev, x: tx, y: ty } : null));
        const ringIndex = getRingAtPoint(tx, ty);
        setHighlightedRing(ringIndex);
      }
    },
    [temporaryDot, draggedDotId, screenToTarget, getRingAtPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (temporaryDot && draggedDotId) {
      setDots((prev) => [
        ...prev,
        { ...temporaryDot, isTemporary: false, isDragging: false },
      ]);
      setTemporaryDot(null);
      setDraggedDotId(null);
      setHighlightedRing(null);
    } else if (mouseDownInfo && !mouseDownInfo.longPress) {
      const { x, y } = screenToTarget(mouseDownInfo.x, mouseDownInfo.y);
      setDots((prev) => [
        ...prev,
        {
          id: uuidv4(),
          x,
          y,
          isTemporary: false,
          isDragging: false,
        },
      ]);
    }
    setMouseDownInfo(null);
  }, [
    longPressTimer,
    temporaryDot,
    draggedDotId,
    mouseDownInfo,
    screenToTarget,
  ]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const scaleBy = 1.1;
      const oldScale = transform.scale;
      const mousePointTo = screenToTarget(
        event.clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
        event.clientY - (canvasRef.current?.getBoundingClientRect().top || 0)
      );
      let newScale = event.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(0.1, Math.min(5, newScale));
      setTransform({
        scale: newScale,
        x: event.clientX - mousePointTo.x * newScale,
        y: event.clientY - mousePointTo.y * newScale,
      });
    },
    [transform.scale, screenToTarget]
  );

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        width={screenSize.width}
        height={screenSize.height}
        style={{
          touchAction: "none",
          cursor: temporaryDot ? "grabbing" : "pointer",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
