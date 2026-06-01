---
name: Logistics Pro
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#414753'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005cb9'
  primary: '#005ab5'
  on-primary: '#ffffff'
  primary-container: '#2173d9'
  on-primary-container: '#fefcff'
  inverse-primary: '#aac7ff'
  secondary: '#4d5f7b'
  on-secondary: '#ffffff'
  secondary-container: '#cbdeff'
  on-secondary-container: '#4f627e'
  tertiary: '#006b1b'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e862d'
  on-tertiary-container: '#f7fff1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458e'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#b4c8e8'
  on-secondary-fixed: '#061c35'
  on-secondary-fixed-variant: '#354862'
  tertiary-fixed: '#94f990'
  tertiary-fixed-dim: '#78dc77'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005313'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 1rem
  gutter-grid: 0.75rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

The design system is engineered for high-utility logistics and field operations. It prioritizes clarity, rapid information processing, and a professional "driver-app" aesthetic. The personality is dependable and systematic, designed to reduce cognitive load in fast-paced environments.

The visual style is **Corporate / Modern** with subtle **Tactile** influences. It utilizes clear segmentation, high-contrast status indicators, and logical grouping of data. The interface evokes a sense of precision through structured grid layouts and a utilitarian approach to iconography and data visualization.

## Colors

The palette is anchored by a deep **Navy (#12263F)** for primary text and structural elements, paired with a **Vibrant Blue (#2E7BE2)** for actions and progress. 

A critical component of this design system is its functional color coding for logistics statuses:
- **Primary Blue:** Used for "Allocated" states and primary calls to action.
- **Success Green:** Used for "Available" space.
- **Warning Yellow:** Used for "Incoming" or pending actions that require attention.
- **Muted Grays:** Used for background containers and secondary metadata to maintain a clean hierarchy.

## Typography

This design system uses a multi-font approach to balance readability with technical precision. **Manrope** is used for structural headings to provide a modern, professional feel. **Inter** handles the bulk of the UI text for its exceptional legibility at small sizes. **JetBrains Mono** is reserved for technical data points (e.g., weights, order numbers) to distinguish dynamic data from static labels.

Hierarchies are reinforced through weight variations rather than extreme size changes, ensuring the UI remains dense but legible on mobile screens.

## Layout & Spacing

The system follows a **Fluid Grid** model optimized for mobile-first utility. A consistent 16px (1rem) side margin is maintained for all main containers.

Layout logic is driven by "Cargo Blocks"—a modular system where space is divided into 2 or 3 column spans depending on the vehicle zone. Elements within lists and cards use a tight 8px or 12px vertical rhythm to keep information "above the fold" and minimize scrolling during active logistics tasks.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** and crisp, low-opacity **Ambient Shadows**. 

- **Surface Level 0:** The main application background in a very light neutral gray.
- **Surface Level 1:** White containers for cards and primary info sections, using a soft shadow (0px 4px 12px rgba(0,0,0,0.05)) to lift them from the background.
- **Interactive Layers:** Status-colored blocks (Green, Blue, Yellow) are flat with high internal contrast, ensuring they feel like tactile "slots" rather than floating elements.

## Shapes

The design system utilizes **Rounded (0.5rem)** corners for standard UI components like buttons and small cards. Larger containers, such as the main "Cargo Capacity" card, use **rounded-lg (1rem)** to soften the interface. This rounded language balances the technical nature of the app with an approachable, modern feel.

## Components

### Buttons
- **Primary Action:** Full-width, vibrant blue background with white bold text. High-contrast and easily tappable.
- **Secondary/Ghost:** Subtle blue text on a light blue-tinted background for lower-priority actions like "Tap to Allocate."

### Status Blocks (Cargo Slots)
- Highly recognizable colored rectangles with centered white icons and text.
- Use semi-bold typography and clear iconography (e.g., Checkmarks for Available, Box icons for Allocated).

### Capacity Progress Bar
- A dual-tone horizontal bar showing percentage-based capacity.
- Features a text overlay that contrasts with both the filled and empty states of the bar.

### Cards
- White backgrounds with soft borders. 
- Content inside cards is divided by thin dividers or clear vertical spacing to separate headers from metadata.

### Informational Chips
- Small, gray-background indicators with icons used for secondary metadata like weight distribution (e.g., "Left: 25kg").