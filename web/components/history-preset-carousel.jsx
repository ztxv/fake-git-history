import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { getHistoryPresets } from "../data/history-presets";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "./ui/carousel";
import { Skeleton } from "./ui/skeleton";

function PresetSkeleton() {
  return (
    <div className="preset-skeleton" aria-label="Loading history recipes">
      {[0, 1, 2].map(item => (
        <div className="preset-skeleton-card" key={item}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-6 h-7 w-3/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-7 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function HistoryPresetCarousel({ onApply }) {
  const [presets, setPresets] = useState(null);
  const [api, setApi] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    getHistoryPresets().then(items => {
      if (active) setPresets(items);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => setActiveIndex(api.selectedScrollSnap());
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  if (presets === null) return <PresetSkeleton />;
  if (presets.length === 0) return null;

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: "start", loop: true, duration: 28 }}
      className="preset-carousel"
      aria-label="History recipe presets"
    >
      <CarouselContent>
        {presets.map((preset, index) => (
          <CarouselItem
            key={preset.id}
            className={`basis-full md:basis-1/2 lg:basis-1/3 preset-slide ${
              activeIndex === index ? "is-active" : ""
            }`}
          >
            <article className="preset-card">
              <div className="preset-card-topline">
                <span>{preset.eyebrow}</span>
                <span>{preset.durationDays} DAYS</span>
              </div>
              <h3>{preset.title}</h3>
              <p>{preset.description}</p>
              <div className="preset-bars" aria-hidden="true">
                {preset.bars.map((height, barIndex) => (
                  <i key={barIndex} style={{ height: `${height * 3 + 5}px` }} />
                ))}
              </div>
              <button type="button" onClick={() => onApply(preset)}>
                Use this recipe <ArrowUpRight size={15} />
              </button>
            </article>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="preset-carousel-footer">
        <div className="preset-dots" aria-label="Choose a slide">
          {presets.map((preset, index) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`Go to ${preset.title}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={activeIndex === index ? "active" : ""}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
        <div className="preset-arrows">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </div>
    </Carousel>
  );
}
