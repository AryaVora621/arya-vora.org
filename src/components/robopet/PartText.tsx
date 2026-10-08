import { Fragment } from "react";

/**
 * Part copy marks part numbers and code with `backticks`. Those render in the mono face and
 * everything else, measurements included, stays in the text face.
 */
export function PartText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((chunk, index) =>
        chunk.startsWith("`") ? (
          <code key={index}>{chunk.slice(1, -1)}</code>
        ) : (
          <Fragment key={index}>{chunk}</Fragment>
        ),
      )}
    </>
  );
}
