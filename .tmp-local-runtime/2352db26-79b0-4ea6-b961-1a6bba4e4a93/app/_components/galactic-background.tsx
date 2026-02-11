type StarConfig = {
  top: string;
  left: string;
  size: string;
  delay: string;
  duration: string;
  opacity: number;
};

const STAR_CONFIG: StarConfig[] = [
  { top: "6%", left: "12%", size: "3px", delay: "0s", duration: "6s", opacity: 0.8 },
  { top: "18%", left: "28%", size: "2px", delay: "1.2s", duration: "8s", opacity: 0.6 },
  { top: "32%", left: "8%", size: "2px", delay: "0.6s", duration: "7s", opacity: 0.7 },
  { top: "22%", left: "72%", size: "3px", delay: "0.4s", duration: "5.5s", opacity: 0.9 },
  { top: "14%", left: "88%", size: "2px", delay: "2.4s", duration: "8s", opacity: 0.7 },
  { top: "38%", left: "64%", size: "3px", delay: "1.8s", duration: "6.8s", opacity: 0.85 },
  { top: "46%", left: "18%", size: "2px", delay: "2.6s", duration: "7.5s", opacity: 0.65 },
  { top: "52%", left: "42%", size: "3px", delay: "0.9s", duration: "6.2s", opacity: 0.8 },
  { top: "58%", left: "70%", size: "2px", delay: "1.6s", duration: "8.6s", opacity: 0.6 },
  { top: "66%", left: "30%", size: "3px", delay: "0.3s", duration: "7.8s", opacity: 0.75 },
  { top: "72%", left: "55%", size: "2px", delay: "1.1s", duration: "6.5s", opacity: 0.7 },
  { top: "78%", left: "82%", size: "3px", delay: "2.1s", duration: "9s", opacity: 0.8 },
  { top: "84%", left: "20%", size: "2px", delay: "1.7s", duration: "7.2s", opacity: 0.6 },
  { top: "88%", left: "45%", size: "3px", delay: "0.5s", duration: "8.4s", opacity: 0.85 },
  { top: "92%", left: "68%", size: "2px", delay: "2.8s", duration: "7s", opacity: 0.7 },
  { top: "12%", left: "52%", size: "3px", delay: "2.2s", duration: "6.6s", opacity: 0.9 },
  { top: "26%", left: "92%", size: "2px", delay: "1.4s", duration: "7.4s", opacity: 0.65 },
  { top: "44%", left: "5%", size: "2px", delay: "0.8s", duration: "5.8s", opacity: 0.7 },
  { top: "60%", left: "90%", size: "3px", delay: "1.9s", duration: "7.9s", opacity: 0.8 },
  { top: "34%", left: "48%", size: "4px", delay: "0.2s", duration: "10s", opacity: 0.95 },
];

export default function GalacticBackground() {
  return (
    <div className="galaxy-animation" aria-hidden>
      <div className="galaxy-aurora" />
      <div className="galaxy-aurora galaxy-aurora--offset" />
      <ul className="galaxy-stars">
        {STAR_CONFIG.map((star, index) => (
          <li
            key={`star-${index}`}
            className="galaxy-star"
            style={
              {
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration,
                opacity: star.opacity,
              } as CSSProperties
            }
          />
        ))}
      </ul>
    </div>
  );
}
import type { CSSProperties } from "react";
