import * as SliderPrimitive from "@radix-ui/react-slider";
export function Slider({ value, ...props }) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className="relative flex w-full touch-none select-none items-center py-2 data-[disabled]:opacity-50"
      value={value}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={
            value.length > 1
              ? i === 0
                ? "Minimum commits per day"
                : "Maximum commits per day"
              : props["aria-label"]
          }
          className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm transition-shadow hover:ring-4 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
