import React from "react";
import { Composition } from "remotion";
import { IAShort } from "./videos/ia/Alex";
import { TOTAL, FPS } from "./videos/ia/story";
export const Root: React.FC = () => (
  <Composition id="IA7Anos" component={IAShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
