export const UI_CONFIG = {
  ZOOM: {
    MIN: 0.1,
    MAX: 2,
    DEFAULT: 1,
    DURATION: 800
  },
  ANIMATIONS: {
    TRANSITION_DEFAULT: 'transform 0.7s cubic-bezier(0.2, 0, 0, 1), opacity 0.5s ease-out',
    TRANSITION_ROOT: 'transform 0.7s cubic-bezier(0.2, 0, 0, 1)',
    EDGE_TRANSITION: 'stroke 0.3s ease, stroke-width 0.3s ease, d 0.7s cubic-bezier(0.2, 0, 0, 1)',
    EXIT_DURATION: 0.5,
    STAGGER: 0.05
  },
  CURVATURE: {
    MIN: 0.1,
    MAX: 0.4,
    DIVISOR: 800
  },
  EXPORT: {
    WIDTH: '800px',
    PADDING: '3rem',
    BORDER_RADIUS: '40px',
    SECTION_GAP: '2.5rem'
  },
  NODE: {
    MIN_WIDTHS: {
      ROOT: '200px',
      LEVEL_1: '200px',
      LEVEL_2: '160px',
      LEVEL_3: '140px',
      DEFAULT: '120px'
    },
    GAPS: {
      TOGGLE_OUTSIDE: '3.5rem' // 14 * 0.25rem
    }
  }
};
