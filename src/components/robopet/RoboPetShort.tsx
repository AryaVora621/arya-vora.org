/*
  The 41-second roboPet boot sequence short film (RoboPetShort.tsx).
  Rendered on both the home page (between RoboPetFilm and RoboPetExploded) and on
  /projects/robopet (following "Where it stands" as the robopet-short custom block).

  A Server Component rendering native HTML: a 9:16 vertical video player with
  captions, no autoplay, and plain copy explaining what the film is.
  Sources: the 41-second short film assets in public/robopet/short/ (robopet-short.mp4,
  robopet-short-poster.webp, and robopet-short.en.vtt).
  The video is an HTML-to-video boot sequence rendered with HyperFrames. Robot footage
  consists of AI concept renders (Gemini image and Veo video) labeled CONCEPT RENDER in
  the film; the voice line is generated with local Piper TTS and the music bed is AI
  generated. The film does not show the printed robot chassis.
*/

export function RoboPetShort({
  heading = "Boot sequence",
}: {
  heading?: string;
  slug?: string;
}) {
  return (
    <section id="short" className="short" aria-labelledby="short-title">
      <div className="short-shell site-shell">
        <div className="short-grid">
          <div className="short-copy">
            <h2 id="short-title" className="short-heading">
              {heading}
            </h2>
            <p className="short-lede">
              A 41-second vertical film built with HyperFrames as roboPet’s simulated boot
              sequence. The log walks through the power rails, the Pico and Zero 2W UART link,
              MPU6050 balance, and the Day 7 reverse-polarity incident.
            </p>
            <p className="short-note">
              The voice line is local Piper TTS and the music is AI generated. The robot footage is
              AI concept renders from Gemini and Veo, labeled CONCEPT RENDER in the film. It does
              not show the printed robot.
            </p>
          </div>
          <div className="short-media">
            <div className="short-frame">
              <video
                controls
                playsInline
                preload="none"
                poster="/robopet/short/robopet-short-poster.webp"
                aria-label="roboPet 41-second boot sequence short film"
                className="short-video"
              >
                <source src="/robopet/short/robopet-short.mp4" type="video/mp4" />
                <track
                  kind="captions"
                  src="/robopet/short/robopet-short.en.vtt"
                  srcLang="en"
                  label="English"
                  default
                />
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
