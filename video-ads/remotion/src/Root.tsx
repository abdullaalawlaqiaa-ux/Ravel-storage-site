import { Composition } from "remotion";
import { Ad01BeforeAfter } from "./Ad01BeforeAfter";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Ad01BeforeAfter"
        component={Ad01BeforeAfter}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
