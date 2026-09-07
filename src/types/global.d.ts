// TypeScript global declarations

declare namespace JSX {
  interface IntrinsicElements {
    "style": React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement> & {
      jsx?: boolean;
      global?: boolean;
    };
  }
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  import React from "react";
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}