"use client";

import ReadingPathView from "./ReadingPathView";

export default function ReadingPathTab({ paperId }: { paperId: number }) {
  return <ReadingPathView key={paperId} paperId={paperId} showLink />;
}
