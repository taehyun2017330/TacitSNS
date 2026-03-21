import React, { useEffect, useMemo, useState } from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';
import { buildPreviewSlides } from './postGoalExplorer.utils';

interface Props {
  goal: PostGoalSuggestion;
}

const PostGoalExampleGallery: React.FC<Props> = ({ goal }) => {
  const slides = useMemo(() => buildPreviewSlides(goal), [goal]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [goal.id]);

  const activeSlide = slides[activeSlideIndex] ?? slides[0];

  if (!activeSlide) {
    return null;
  }

  const goToPrevious = () => {
    setActiveSlideIndex(currentIndex => (currentIndex - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setActiveSlideIndex(currentIndex => (currentIndex + 1) % slides.length);
  };

  return (
    <div className="post-goal-preview-gallery">
      <div className="post-goal-preview-stage">
        <article
          className="post-goal-preview-canvas"
          style={{ background: goal.previewBackground }}
        >
          <div className="post-goal-preview-chrome">
            <span>{activeSlide.format}</span>
            <span>
              {activeSlideIndex + 1} / {slides.length}
            </span>
          </div>

          <div className="post-goal-preview-copy">
            <div className="post-goal-preview-kicker">{activeSlide.kicker}</div>
            <strong>{activeSlide.headline}</strong>
            <p>{activeSlide.caption}</p>
          </div>
        </article>

        {slides.length > 1 ? (
          <div className="post-goal-preview-controls">
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              onClick={goToPrevious}
              aria-label="Show previous example"
            >
              Prev
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              onClick={goToNext}
              aria-label="Show next example"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="post-goal-preview-thumb-row" aria-label="Example post previews">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`post-goal-preview-thumb ${index === activeSlideIndex ? 'is-active' : ''}`}
              onClick={() => setActiveSlideIndex(index)}
            >
              <span>{slide.format}</span>
              <strong>{slide.kicker}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PostGoalExampleGallery;
