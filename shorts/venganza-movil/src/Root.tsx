import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './Scene';
import {DUR, FPS} from './anim';
export const Root: React.FC = () => (
  <Composition id="Venganza" component={Scene} durationInFrames={DUR} fps={FPS} width={1080} height={1920} />
);
