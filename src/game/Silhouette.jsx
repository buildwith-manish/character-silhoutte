import React from "react";
import { Img, staticFile } from "remotion";
import { silhouetteSVG } from "../hero-svg";

// One character, either as a pure-black silhouette or in full colour. Characters whose PNG is not in public/game/ yet
// fall back to the generic placeholder hero so the Studio and test renders never break.
export const Silhouette = ({ char, size = 1000, color = false, style }) => {
  const box = { position: "relative", width: size, height: size, ...style };
  if (!char.hasImage) {
    return (
      <div style={box}>
        <div
          style={{ position: "absolute", left: "50%", top: 0, width: 386, height: 540, transform: `translateX(-50%) scale(${size / 540})`, transformOrigin: "50% 0", filter: color ? "none" : "brightness(0)" }}
          dangerouslySetInnerHTML={{ __html: silhouetteSVG(0, 200) }}
        />
      </div>
    );
  }
  return (
    <div style={box}>
      <Img src={staticFile(`game/${char.imageFile}`)} style={{ width: "100%", height: "100%", objectFit: "contain", filter: color ? "none" : "brightness(0)" }} />
    </div>
  );
};
