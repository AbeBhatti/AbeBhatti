import React from "react";
import { Composition } from "remotion";
import { Banner } from "./Banner";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Banner"
        component={Banner}
        durationInFrames={300}
        fps={30}
        width={800}
        height={160}
      />
    </>
  );
};
