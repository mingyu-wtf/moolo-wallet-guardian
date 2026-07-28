"use client";

import { Lightbulb } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface GuidedDemoPresenterNoteProps {
  note: string;
  talkingPoints: [string, string];
}

export function GuidedDemoPresenterNote({
  note,
  talkingPoints,
}: GuidedDemoPresenterNoteProps) {
  const { t, tx } = useTranslation();
  return (
    <section className="guided-presenter-note">
      <div className="guided-note-label">
        <Lightbulb size={15} aria-hidden="true" />
        {t("Presenter note")}
      </div>
      <p>{tx(note)}</p>
      <details>
        <summary>{t("What to point out")}</summary>
        <ul>
          {talkingPoints.map((point) => (
            <li key={point}>{tx(point)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
