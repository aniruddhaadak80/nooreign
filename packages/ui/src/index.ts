/**
 * Nooreign design system — public surface.
 *
 * Everything the web app may import lives here. The three pure layers (`lib`,
 * `svg`) are exported alongside the components because the SVG generators are
 * genuinely useful outside React — the static export pipeline draws the same
 * crests and terrain plates at build time.
 */

/* ------------------------------- pure ------------------------------- */
export { cn } from "./lib/cn";
export type { ClassValue } from "./lib/cn";

export {
  AXIOM_COLORS,
  PALETTE,
  contrastLevel,
  contrastRatio,
  hexToRgb,
  mix,
  readableInk,
  relativeLuminance,
  rgbToHex,
  shade,
  withAlpha,
} from "./lib/palette";
export type { PaletteToken, Rgb } from "./lib/palette";

export {
  FORMAT_CURRENT_YEAR,
  formatCompact,
  formatConfidence,
  formatPercent,
  formatSigned,
  formatSpan,
  formatUtilons,
  formatYear,
  slugify,
  titleCase,
  truncate,
} from "./lib/format";

export {
  arcPath,
  areaPath,
  bandScale,
  clampScale,
  curveTension,
  ordinalColors,
  radialPosition,
  ringAngles,
  sparklinePath,
} from "./lib/scales";
export type { BandScale, ClampScale, PathOptions, Point } from "./lib/scales";

/* -------------------------------- svg ------------------------------- */
export { CHARGES, crestPath, isCharge, shieldPath } from "./svg/crests";
export type { Charge, CrestGeometry } from "./svg/crests";

export { hashSeed, terrainPath } from "./svg/terrain";
export type { TerrainArt } from "./svg/terrain";

export { initialPath, portraitSvg, sigilInitials, sigilSeed } from "./svg/portraits";
export type { InitialGeometry, PortraitArt } from "./svg/portraits";

/* ----------------------------- primitives ---------------------------- */
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";
export { IconButton } from "./components/icon-button";
export type { IconButtonProps } from "./components/icon-button";
export { LinkButton } from "./components/link-button";
export type { LinkButtonProps } from "./components/link-button";
export { Badge, badgeVariants } from "./components/badge";
export type { BadgeProps } from "./components/badge";
export { Chip } from "./components/chip";
export type { ChipProps } from "./components/chip";
export { TagRow } from "./components/tag-row";
export type { TagRowProps } from "./components/tag-row";
export { Kbd } from "./components/kbd";
export type { KbdProps } from "./components/kbd";
export { Divider } from "./components/divider";
export type { DividerProps } from "./components/divider";
export { Skeleton } from "./components/skeleton";
export type { SkeletonProps } from "./components/skeleton";
export { EmptyState } from "./components/empty-state";
export type { EmptyStateProps } from "./components/empty-state";
export { Card } from "./components/card";
export type { CardProps } from "./components/card";
export { Panel } from "./components/panel";
export type { PanelProps } from "./components/panel";
export { StatTile } from "./components/stat-tile";
export type { StatTileProps } from "./components/stat-tile";
export { KeyValueList } from "./components/key-value-list";
export type { KeyValueListProps } from "./components/key-value-list";
export { DefinitionList } from "./components/definition-list";
export type { DefinitionListProps } from "./components/definition-list";
export { Callout } from "./components/callout";
export type { CalloutProps } from "./components/callout";
export { QuoteCard } from "./components/quote-card";
export type { QuoteCardProps } from "./components/quote-card";
export { CodeBlock } from "./components/code-block";
export type { CodeBlockProps } from "./components/code-block";
export { Accordion } from "./components/accordion";
export type { AccordionItem, AccordionProps } from "./components/accordion";
export { Tabs } from "./components/tabs";
export type { TabItem, TabsProps } from "./components/tabs";
export { Tooltip } from "./components/tooltip";
export type { TooltipProps } from "./components/tooltip";
export { Dialog } from "./components/dialog";
export type { DialogProps } from "./components/dialog";
export { Input } from "./components/input";
export type { InputProps } from "./components/input";
export { Textarea } from "./components/textarea";
export type { TextareaProps } from "./components/textarea";
export { Select } from "./components/select";
export type { SelectProps } from "./components/select";
export { Toggle } from "./components/toggle";
export type { ToggleGroupItem, ToggleProps } from "./components/toggle";
export { Slider } from "./components/slider";
export type { SliderProps } from "./components/slider";
export { SegmentedControl } from "./components/segmented-control";
export type { SegmentedControlProps, SegmentedOption } from "./components/segmented-control";
export { SearchInput } from "./components/search-input";
export type { SearchInputProps } from "./components/search-input";
export { ProgressBar } from "./components/progress-bar";
export type { ProgressBarProps } from "./components/progress-bar";
export { Table } from "./components/table";
export type { TableColumn, TableProps } from "./components/table";
export { TableOfContents, TocSlot } from "./components/table-of-contents";
export type { TableOfContentsProps, TocEntry, TocSlotProps } from "./components/table-of-contents";
export { Breadcrumb } from "./components/breadcrumb";
export type { BreadcrumbProps } from "./components/breadcrumb";
export { SectionHeader } from "./components/section-header";
export type { SectionHeaderProps } from "./components/section-header";
export { PageHeader } from "./components/page-header";
export type { PageHeaderProps, PageMeta } from "./components/page-header";
export { ScrollProgress } from "./components/scroll-progress";
export type { ScrollProgressProps } from "./components/scroll-progress";

/* --------------------------- domain chrome --------------------------- */
export { KingdomCrest } from "./components/kingdom-crest";
export type { KingdomCrestProps } from "./components/kingdom-crest";
export { KingdomCard } from "./components/kingdom-card";
export type { KingdomCardProps } from "./components/kingdom-card";
export { TerrainPlate } from "./components/terrain-plate";
export type { TerrainPlateProps } from "./components/terrain-plate";
export { AtlasMap, RELATION_STYLE } from "./components/atlas-map";
export type { AtlasEdge, AtlasMapProps } from "./components/atlas-map";
export { AdvisorPortrait } from "./components/advisor-portrait";
export type { AdvisorPortraitProps } from "./components/advisor-portrait";
export { AdvisorCard } from "./components/advisor-card";
export type { AdvisorCardProps } from "./components/advisor-card";
export { CourtList } from "./components/court-list";
export type { CourtListProps } from "./components/court-list";
export { DilemmaCard } from "./components/dilemma-card";
export type { DilemmaCardProps } from "./components/dilemma-card";
export { OptionTable } from "./components/option-table";
export type { OptionTableProps } from "./components/option-table";
export { StanceMeter } from "./components/stance-meter";
export type { StanceMeterProps } from "./components/stance-meter";
export { ArgumentGraph } from "./components/argument-graph";
export type { ArgumentEdge, ArgumentGraphProps, ArgumentNode } from "./components/argument-graph";
export { TraceList } from "./components/trace-list";
export type { TraceListProps } from "./components/trace-list";
export { TraceRow } from "./components/trace-row";
export type { TraceRowProps } from "./components/trace-row";
export { RingGauge } from "./components/ring-gauge";
export type { RingGaugeProps } from "./components/ring-gauge";
export { Sparkline } from "./components/sparkline";
export type { SparklineProps } from "./components/sparkline";
export { BarMeter } from "./components/bar-meter";
export type { BarMeterProps } from "./components/bar-meter";
export { Heatmap } from "./components/heatmap";
export type { HeatmapCell, HeatmapProps } from "./components/heatmap";
export { EraCard } from "./components/era-card";
export type { EraCardProps } from "./components/era-card";
export { EraRail } from "./components/era-rail";
export type { EraRailProps } from "./components/era-rail";
export { TechniqueTower } from "./components/technique-tower";
export type { TechniqueTowerProps } from "./components/technique-tower";
export { StackChart } from "./components/stack-chart";
export type { StackChartProps, StackSlice } from "./components/stack-chart";
export { UtilonMeter } from "./components/utilon-meter";
export type { UtilonMeterProps } from "./components/utilon-meter";
export { NavBar } from "./components/nav-bar";
export type { NavBarProps, NavLink } from "./components/nav-bar";
export { Footer } from "./components/footer";
export type { FooterProps } from "./components/footer";
export { Logo } from "./components/logo";
export type { LogoProps } from "./components/logo";