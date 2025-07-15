import React from "react";

type ScreenSize = {
  width: number;
  height: number;
};

export default function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return screenSize;
}

export { type ScreenSize };
