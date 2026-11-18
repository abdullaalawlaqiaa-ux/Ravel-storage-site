import { Composition } from "remotion";
import { Ad01BeforeAfter } from "./Ad01BeforeAfter";
import { AD01V2_FRAMES, Ad01v2 } from "./Ad01v2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Ad01BeforeAfter" component={Ad01BeforeAfter} durationInFrames={210} fps={30} width={1080} height={1920} />
      <Composition id="Ad01v2" component={Ad01v2} durationInFrames={AD01V2_FRAMES} fps={30} width={1080} height={1920} />
    </>
  );
};
