import type { CategoryColor, CategoryIcon } from "@/lib/study-types";
import {
  Timer,
  Calculator,
  PieChart,
  BookOpen,
  FlaskConical,
  Globe2,
  Code2,
  Brain,
  Target,
  PenLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const colorMap: Record<
  CategoryColor,
  { bg: string; chipBg: string; chipText: string; iconBg: string; iconText: string; bar: string }
> = {
  amber: {
    bg: "bg-[oklch(0.98_0.03_75)]",
    chipBg: "bg-[oklch(0.95_0.07_75)]",
    chipText: "text-[oklch(0.45_0.15_65)]",
    iconBg: "bg-[oklch(0.92_0.09_75)]",
    iconText: "text-[oklch(0.5_0.16_65)]",
    bar: "bg-[oklch(0.7_0.16_65)]",
  },
  sky: {
    bg: "bg-[oklch(0.98_0.02_230)]",
    chipBg: "bg-[oklch(0.94_0.05_230)]",
    chipText: "text-[oklch(0.45_0.15_240)]",
    iconBg: "bg-[oklch(0.92_0.07_230)]",
    iconText: "text-[oklch(0.5_0.16_240)]",
    bar: "bg-[oklch(0.65_0.17_240)]",
  },
  peach: {
    bg: "bg-[oklch(0.98_0.025_40)]",
    chipBg: "bg-[oklch(0.94_0.06_40)]",
    chipText: "text-[oklch(0.5_0.18_35)]",
    iconBg: "bg-[oklch(0.92_0.08_40)]",
    iconText: "text-[oklch(0.55_0.18_35)]",
    bar: "bg-[oklch(0.7_0.18_35)]",
  },
  mint: {
    bg: "bg-[oklch(0.98_0.025_165)]",
    chipBg: "bg-[oklch(0.94_0.06_165)]",
    chipText: "text-[oklch(0.45_0.13_165)]",
    iconBg: "bg-[oklch(0.92_0.08_165)]",
    iconText: "text-[oklch(0.5_0.15_165)]",
    bar: "bg-[oklch(0.65_0.15_165)]",
  },
  rose: {
    bg: "bg-[oklch(0.98_0.02_0)]",
    chipBg: "bg-[oklch(0.94_0.05_0)]",
    chipText: "text-[oklch(0.5_0.18_15)]",
    iconBg: "bg-[oklch(0.92_0.07_0)]",
    iconText: "text-[oklch(0.55_0.2_15)]",
    bar: "bg-[oklch(0.65_0.2_15)]",
  },
  violet: {
    bg: "bg-[oklch(0.98_0.02_290)]",
    chipBg: "bg-[oklch(0.94_0.05_290)]",
    chipText: "text-[oklch(0.45_0.18_290)]",
    iconBg: "bg-[oklch(0.92_0.07_290)]",
    iconText: "text-[oklch(0.5_0.2_290)]",
    bar: "bg-[oklch(0.6_0.22_290)]",
  },
};

export const iconMap: Record<CategoryIcon, LucideIcon> = {
  timer: Timer,
  calculator: Calculator,
  chart: PieChart,
  book: BookOpen,
  flask: FlaskConical,
  globe: Globe2,
  code: Code2,
  brain: Brain,
  target: Target,
  pen: PenLine,
};