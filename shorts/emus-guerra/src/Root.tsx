import React from "react";
import { Composition } from "remotion";
import { EmusShort } from "./videos/emus/Short";
import { TOTAL, FPS } from "./videos/emus/story";
export const Root: React.FC = () => (
  <Composition id="GuerraEmus" component={EmusShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
