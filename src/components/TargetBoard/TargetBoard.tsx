import React from "react";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Ring,
  type KonvaNodeComponent,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import * as LayerType from "konva/lib/Layer";

import useScreenSize, { type ScreenSize } from "../../hooks/useScreenSize";
import {
  initialRingRadius,
  ringGap,
  ringColors,
  boardSize,
} from "../../constant";

import styles from "./TargetBoard.module.css";

type TransformProps = {
  x: number;
  y: number;
  scale: number;
};

export default function TargetBoard() {
  const screenSize = useScreenSize();
  const wrapperRef = React.useRef(null);
  const mainLayerRef = React.useRef(null);
  const dragLayerRef = React.useRef(null);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Stage
        width={screenSize.width}
        height={screenSize.height}
        style={{ padding: 0, margin: 0 }}
      >
        <Layer ref={mainLayerRef}>
          {TargetPaper(screenSize, mainLayerRef, dragLayerRef)}
        </Layer>
        <Layer ref={dragLayerRef} />
      </Stage>
    </div>
  );
}

function TargetPaper(
  screenSize: ScreenSize,
  mainLayerRef: React.RefObject<KonvaNodeComponent<LayerType.Layer> | null>,
  dragLayerRef: React.RefObject<KonvaNodeComponent<LayerType.Layer> | null>
) {
  const [transform, setTransform] = React.useState<TransformProps>({
    x: screenSize.width / 2,
    y: screenSize.width / 2,
    scale: 1,
  });

  const handleDragStart = (event: KonvaEventObject<DragEvent>) => {
    const target = event.target;
    target.moveTo(dragLayerRef.current);
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const target = event.target;
    target.moveTo(mainLayerRef.current);
  };

  return (
    <Group
      draggable
      position={{
        x: transform.x,
        y: transform.y,
      }}
      scale={{ x: transform.scale, y: transform.scale }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Rect
        position={{
          x: -(boardSize / 2),
          y: -(boardSize / 2),
        }}
        scaleX={0.2}
        scaleY={0.2}
        width={boardSize}
        height={boardSize}
        fill="#fff"
        stroke="black"
      />
      {ringColors.map((color, i) => {
        const outerRadius = initialRingRadius - i * ringGap;
        const innerRadius = outerRadius - ringGap;
        return (
          <Ring
            key={`${color}-${i}-${outerRadius}`}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill={color}
            scaleX={0.2}
            scaleY={0.2}
            stroke={color === "#000" && i % 2 ? "#fff" : "#000"}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
